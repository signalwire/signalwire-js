import { isRequesterValidationError } from '../utils/authRecovery';
import { getLogger } from '../utils/logger';

import type { StorageManager } from './StorageManager';
import type { Address } from '../core/entities/Address';
import type { Call, CallOptions } from '../core/entities/types/call.types';
import type { MediaDirections } from '../core/types/media.types';
import type { DeviceController } from '../interfaces/DeviceController';

const logger = getLogger();
interface AttachableCall {
  id: string;
  to?: string;
  mediaDirections: MediaDirections;
  nodeId?: string;
}

export interface OutboundCallProvider {
  createOutboundCall(destination: string | Address, options?: CallOptions): Promise<Call>;
}

interface Attachment {
  destination: string;
  mediaDirections: MediaDirections;
  audioInputDevice: MediaDeviceInfo | null;
  videoInputDevice: MediaDeviceInfo | null;
  nodeId?: string;
  attachedAt: number;
}

export class AttachManager {
  private session!: OutboundCallProvider;
  // Serializes read-modify-write sequences against storage. Each mutation
  // chains onto this promise so concurrent attach()/detach() calls can't
  // interleave reads and clobber each other's writes.
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: StorageManager,

    private readonly deviceController: DeviceController,
    private readonly reconnectCallsTimeout: number,
    private attachKey: string,
    /**
     * Whether a credential recovery has been verified on this client — the
     * session reauthenticated with a fresh token AND the operation that
     * reauthentication was meant to unblock then succeeded. Gates attach-record
     * discard together with the failure kind: a record is dropped only when
     * this is true AND the reattach refusal was NOT a credential refusal
     * (-32003). See {@link reattachCalls}.
     */
    private readonly credentialRecovered: () => boolean
  ) {}

  async detachAll(): Promise<void> {
    await this.mutate((attached) => {
      // Return an empty record — one atomic write replaces the full map.
      void attached;
      return {};
    });
  }

  public setSession(session: OutboundCallProvider): void {
    this.session = session;
  }

  private async readAttached(): Promise<Record<string, Attachment>> {
    try {
      return (await this.storage.getItem(this.attachKey)) ?? {};
    } catch (error) {
      logger.warn('[AttachManager] Failed to retrieve attached calls from storage', error);
      return {};
    }
  }

  private async writeAttached(attached: Record<string, Attachment>): Promise<void> {
    try {
      await this.storage.setItem(this.attachKey, attached);
    } catch (error) {
      logger.warn('[AttachManager] Failed to write attached calls to storage', error);
    }
  }

  /**
   * Serialize a read-modify-write operation against the attached-calls
   * storage. The mutator receives the current state and returns the new
   * state. Concurrent calls queue behind the in-flight one so writes never
   * interleave.
   */
  private async mutate(
    mutator: (
      current: Record<string, Attachment>
    ) => Record<string, Attachment> | Promise<Record<string, Attachment>>
  ): Promise<void> {
    const next = this.writeQueue.then(async () => {
      const current = await this.readAttached();
      const updated = await mutator(current);
      await this.writeAttached(updated);
    });
    // Swallow rejection on the queue itself so one failed mutation doesn't
    // poison all future ones — individual awaiters still see their rejection.
    this.writeQueue = next.catch(() => undefined);
    return next;
  }

  public async attach(call: AttachableCall): Promise<void> {
    if (!call.to) {
      logger.warn('[AttachManager] Skip attach for calls with no destination');
      return;
    }
    const attachment = this.buildAttachment(call, call.to);
    await this.mutate((attached) => ({ ...attached, [call.id]: attachment }));
  }

  /**
   * Keep an already-stored call's reference alive and current — the periodic
   * refresh the `verto.ping` keepalive drives.
   *
   * Only ever updates: a call with no record is one nothing wants reattached,
   * and re-creating it here would undo a `detach`. That matters because a ping
   * can land in the window between `bye()` detaching and the call being torn
   * down, and a record revived there survives the hangup — so the next page
   * load dials a call nobody is on. The existence check and the write share
   * one {@link mutate} turn, so a concurrent detach cannot slip between them.
   */
  public async refresh(call: AttachableCall): Promise<void> {
    if (!call.to) {
      return;
    }
    const destination = call.to;
    await this.mutate((attached) => {
      // Object.hasOwn — see consumePendingAttachment on why a truthy check
      // on the value would not type-check here.
      if (!Object.hasOwn(attached, call.id)) {
        return attached;
      }
      return { ...attached, [call.id]: this.buildAttachment(call, destination) };
    });
  }

  private buildAttachment(call: AttachableCall, destination: string): Attachment {
    return {
      nodeId: call.nodeId,
      destination,
      mediaDirections: call.mediaDirections,
      audioInputDevice:
        call.mediaDirections.audio !== 'inactive'
          ? this.deviceController.selectedAudioInputDevice
          : null,
      videoInputDevice:
        call.mediaDirections.video !== 'inactive'
          ? this.deviceController.selectedVideoInputDevice
          : null,
      attachedAt: Date.now()
    };
  }

  public async detach(call: AttachableCall): Promise<void> {
    await this.mutate((attached) => {
      const { [call.id]: _, ...remaining } = attached;
      return remaining;
    });
  }

  public async flush(): Promise<void> {
    await this.mutate(() => ({}));
  }

  /**
   * Reattach to previously active calls by sending verto.invite with
   * reattaching: true.
   *
   * NOTE: This currently fails with INVALID_CALL_REFERENCE because the
   * server's jsock UUID check rejects the new connection's UUID. A
   * server-side fix is needed: when reattaching: true is explicitly set
   * in dialogParams, FreeSWITCH's attempt_reattach() should update the
   * call's jsock reference to the new connection's UUID instead of
   * rejecting. Once that fix is deployed, this will work for both
   * page reloads and WebSocket reconnects.
   *
   * A failed reattach does NOT generally cost the stored reference. It is
   * discarded only when the server denied the reattach on a session whose
   * credential it had already accepted — a verified reauthentication followed
   * by a refusal is the server saying the call is gone, and that is the one
   * refusal worth acting on. Until then the credential may be what is being
   * refused, and the record is the only way a later reload can try again;
   * keeping it costs nothing, since `detachExpired` reaps it once it is older
   * than `reconnectCallsTimeout`.
   */
  public async reattachCalls(): Promise<void> {
    const attached = await this.readAttached();

    await this.detachExpired();

    for (const [callId, attachment] of Object.entries(attached)) {
      const { destination } = attachment;
      const options = this.buildCallOptions(attachment);

      let succeeded = false;
      let refusedOnCredentials = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.session.createOutboundCall(destination, { callId, ...options });
          logger.info(`[AttachManager] Reattached call ${callId} (attempt ${attempt})`);
          succeeded = true;
          break;
        } catch (error) {
          logger.warn(
            `[AttachManager] Reattach attempt ${attempt}/3 failed for call ${callId}:`,
            error
          );
          if (isRequesterValidationError(error)) {
            // The session credential is what the server refused, so every
            // attempt gets the same answer. Healing it belongs to the
            // credential path; spending the remaining attempts and their
            // backoff here only delays the failure. Deliberately narrower than
            // isRecoverableAuthError: -32002 is overloaded server-side for
            // call-level rejections (CALL ERROR / INVALID_MSG_UNSPECIFIED),
            // which say nothing about the credential.
            refusedOnCredentials = true;
            logger.warn(
              `[AttachManager] Reattach of ${callId} was refused on credentials; not retrying.`
            );
            break;
          }
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
          }
        }
      }

      if (!succeeded) {
        // A credential refusal is never grounds to discard, even after a verified
        // reauthentication: -32003 means the credential is what the server just
        // refused, so the call may still be there and a later reload can retry.
        // Discarding is reserved for a refusal on a credential the server DID
        // accept — that is the server saying the call itself is gone.
        if (this.credentialRecovered() && !refusedOnCredentials) {
          logger.warn(
            `[AttachManager] Reattach of ${callId} was denied after a verified reauthentication, removing reference`
          );
          await this.detach({ id: callId, mediaDirections: attachment.mediaDirections });
        } else {
          logger.warn(
            `[AttachManager] Reattach failed for call ${callId}; keeping the reference (credential refused or never proven good)`
          );
        }
      }
    }
  }

  /**
   * Build CallOptions from stored attachment data for a call being reattached.
   * Also used by the session-level verto.attach handler.
   */
  public buildCallOptions(attachment: Attachment): CallOptions {
    const { audio: audioDirection, video: videoDirection } = attachment.mediaDirections;
    const { audioInputDevice, videoInputDevice, nodeId } = attachment;
    const receiveAudio = audioDirection.includes('recv');
    const receiveVideo = videoDirection.includes('recv');
    const sendAudio = audioDirection.includes('send');
    const sendVideo = videoDirection.includes('send');
    const inputAudioDeviceConstraints = sendAudio
      ? { audio: true, ...this.deviceController.deviceInfoToConstraints(audioInputDevice) }
      : undefined;
    const inputVideoDeviceConstraints = sendVideo
      ? { video: true, ...this.deviceController.deviceInfoToConstraints(videoInputDevice) }
      : undefined;
    return {
      nodeId,
      receiveAudio,
      receiveVideo,
      inputAudioDeviceConstraints,
      inputVideoDeviceConstraints,
      reattach: true
    };
  }

  /**
   * Look up stored attachment data for a call id and return CallOptions
   * suitable for rehydrating a reattached call. Returns undefined when no
   * matching entry exists in storage.
   *
   * Used by the session-level verto.attach handler when the server pushes
   * an attach event for a call the client doesn't have an object for yet
   * (e.g. after a reload).
   */
  public async consumePendingAttachment(callId: string): Promise<CallOptions | undefined> {
    const attached = await this.readAttached();
    // Object.hasOwn — the record's type omits `| undefined` on index access
    // (noUncheckedIndexedAccess is off), so a truthy-check on the value would
    // be flagged as always-truthy by the type checker even though the key
    // may be absent at runtime.
    if (!Object.hasOwn(attached, callId)) {
      return undefined;
    }
    return this.buildCallOptions(attached[callId]);
  }

  private async detachExpired(): Promise<void> {
    const now = Date.now();
    const timeout = this.reconnectCallsTimeout;
    await this.mutate((attached) => {
      const remaining = { ...attached };
      let changed = false;
      for (const [callId, attachment] of Object.entries(attached)) {
        if (now - attachment.attachedAt > timeout) {
          delete remaining[callId];
          changed = true;
        }
      }
      return changed ? remaining : attached;
    });
  }
}
