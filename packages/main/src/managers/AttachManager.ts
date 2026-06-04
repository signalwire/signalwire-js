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
    private attachKey: string
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
    const destination = call.to;
    const attachment: Attachment = {
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
    await this.mutate((attached) => ({ ...attached, [call.id]: attachment }));
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
   * Failed reattach attempts are handled gracefully — the stale call
   * reference is cleaned up from storage.
   */
  public async reattachCalls(): Promise<void> {
    const attached = await this.readAttached();

    await this.detachExpired();

    for (const [callId, attachment] of Object.entries(attached)) {
      const { destination } = attachment;
      const options = this.buildCallOptions(attachment);

      let succeeded = false;
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
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
          }
        }
      }

      if (!succeeded) {
        logger.warn(
          `[AttachManager] Reattach failed after 3 attempts for call ${callId}, removing reference`
        );
        await this.detach({ id: callId, mediaDirections: attachment.mediaDirections });
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
