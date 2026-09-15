/* eslint-disable max-lines */
import {
  EmptyError,
  filter,
  firstValueFrom,
  map,
  merge,
  race,
  startWith,
  take,
  takeUntil,
  timeout,
  TimeoutError,
  switchMap
} from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import { RTCPeerConnectionController } from '../controllers/RTCPeerConnectionController';
import { DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS, INVITE_VERSION } from '../core/constants';
import {
  AuxiliaryLegCancelledError,
  AuxiliaryLegTimeoutError,
  DependencyError,
  InvalidParams,
  JSONRPCError,
  MediaAccessError,
  ScreenShareAlreadyActiveError,
  VertoPongError
} from '../core/errors';
import {
  VertoAnswer,
  VertoBye,
  VertoByeCauseCodes,
  VertoInfo,
  VertoInvite,
  VertoModify,
  VertoPong,
  WebrtcVerto
} from '../core/RPCMessages';
import { isCallJoinedPayload } from '../core/RPCMessages/guards/events.guards';
import {
  isVertoAnswerInnerParams,
  isVertoAttachMessage,
  isVertoByeInboundMessage,
  isVertoByeInboundParamsGuard,
  isVertoInviteMessage,
  isVertoMediaInnerParams,
  isVertoMediaParamsInnerParams,
  isVertoPingInnerParams
} from '../core/RPCMessages/guards/verto.guards';
import { filterAs } from '../operators';
import { filterNull } from '../operators/filterNull';
import { getValueFrom } from '../utils/getValueFrom';
import { getLogger } from '../utils/logger';
import { toError } from '../utils/toError';

import type { AttachManager } from './AttachManager';
import type { LocalAudioPipeline } from '../controllers/LocalAudioPipeline';
import type {
  ExecuteVertoOptions,
  ScreenShareStatus,
  SignalingStatus,
  TransferOptions,
  WebRTCVertoManagerOptions
} from './types/verto-manager.types';
import type { RTCPeerConnectionControllerOptionsPartial } from '../controllers/RTCPeerConnectionController';
import type { WebRTCCall } from '../core/entities/Call';
import type { VertoRPCMessage } from '../core/RPCMessages';
import type { JSONRPCResponse } from '../core/RPCMessages/types/base';
import type { CallJoinedPayload } from '../core/RPCMessages/types/events';
import type {
  VertoAnswerParams,
  VertoAttachParams,
  VertoByeCause,
  VertoByeInboundParams,
  VertoMediaParams,
  VertoMediaParamsParams,
  VertoPingParams
} from '../core/RPCMessages/types/verto';
import type { RTCPeerConnectionPropose } from '../core/types/call.types';
import type { MediaOptions, MediaDirections, ScreenShareOptions } from '../core/types/media.types';
import type { VertoMethod } from '../core/types/rpc.types';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';
import type { WebRTCVerto } from '../interfaces/WebRTCVerto';
import type { BehaviorSubject, Observable } from 'rxjs';

const logger = getLogger();

/**
 * Decide what value goes on the `node_id` field of a `webrtc.verto` envelope.
 *
 * - **Reattach invite:** must carry the persisted nodeId so the server routes
 *   the new connection to the FreeSWITCH instance that holds the existing call.
 * - **Fresh invite, caller-supplied `CallOptions.nodeId`:** carry the explicit
 *   value as a steering hint (dev/staging traffic pinning). Server may honour
 *   or ignore for placement reasons.
 * - **Fresh invite, no caller nodeId:** strip to `''` = "server picks".
 * - **Non-invite frames** (verto.modify, verto.bye, etc.): always carry the
 *   current `_nodeId$.value` so the frame targets the node hosting the call.
 *
 * Pure function — exported for unit testing.
 */
export function resolveInviteNodeId(args: {
  isInvite: boolean;
  reattach: boolean;
  explicitNodeId: string | undefined;
  currentNodeId: string | null;
}): string {
  const stripForFresh = args.isInvite && !args.reattach && !args.explicitNodeId;
  return stripForFresh ? '' : (args.currentNodeId ?? '');
}

/**
 * Surface the real outcome of a `webrtc.verto` reply.
 *
 * A webrtc.verto response nests several envelopes, each keyed by a verto-style
 * string `code` ("200" ok, "400"/etc. fail) rather than a JSON-RPC `error`. An outer
 * layer reports only whether the frame was delivered; an inner layer carries the op's
 * own outcome:
 *
 *   response.result = { code:"200", result:{…} }            ← delivery acknowledgement
 *     .result       = { jsonrpc, id, result:{…} }           ← the reply payload
 *       .result     = { code:"400", message:"Bad request" } ← the actual op outcome
 *
 * A failure can appear at any layer (delivery refused, or the op itself rejected
 * deeper down), so walk every nested `.result` object and return the FIRST non-2xx
 * `code` with its message. Returns null when every `code` seen is 2xx or absent —
 * i.e. the op succeeded. This is the only way to detect that e.g. a mute/kick was
 * rejected, since the outer delivery `code` is "200" (delivered) even then.
 *
 * Pure function — exported for unit testing.
 */
export function findNestedVertoFailure(
  response: unknown
): { code: string; message?: string } | null {
  let node: unknown = response;
  while (node !== null && typeof node === 'object') {
    const obj = node as { code?: unknown; message?: unknown; result?: unknown; error?: unknown };

    // A refused op can arrive in either of two shapes at any depth. A JSONRPC `error`
    // member is checked FIRST: its code lives one level in ({ error: { code, message } }),
    // so a walk that only looks at a bare `code` steps straight past it and reports
    // success — which is how an "Invalid Request" reply surfaced as a silent no-op, with
    // the caller's promise resolving and the state observable simply never changing.
    const err = obj.error;
    if (err !== null && typeof err === 'object') {
      const e = err as { code?: unknown; message?: unknown };
      const errCode =
        typeof e.code === 'string' || typeof e.code === 'number' ? String(e.code) : undefined;

      if (errCode !== undefined && !/^2\d\d$/.test(errCode)) {
        return {
          code: errCode,
          message: typeof e.message === 'string' ? e.message : undefined
        };
      }
    }

    // A verto `code` is a string or a number ("200" / 200) and a `message` is a string.
    // Narrow to those rather than stringifying `unknown`, so a non-primitive never becomes
    // the literal "[object Object]" and get mistaken for a failure code.
    const code =
      typeof obj.code === 'string' || typeof obj.code === 'number' ? String(obj.code) : undefined;
    if (code !== undefined && !/^2\d\d$/.test(code)) {
      return {
        code,
        message: typeof obj.message === 'string' ? obj.message : undefined
      };
    }
    node = obj.result !== null && typeof obj.result === 'object' ? obj.result : null;
  }
  return null;
}

export abstract class VertoManager extends Destroyable {
  protected callSession?: WebRTCCall;

  constructor(callSession?: WebRTCCall) {
    super();
    this.callSession = callSession;
  }

  public destroy(): void {
    this.callSession = undefined;
    super.destroy();
  }
}
export class WebRTCVertoManager extends VertoManager implements WebRTCVerto {
  public mediaDirections$!: Observable<MediaDirections>;
  public localStream$!: Observable<MediaStream>;
  public remoteStream$!: Observable<MediaStream>;
  private readonly onError?: (error: Error, options?: { fatal?: boolean }) => void;
  private readonly onModifyFailed?: () => void;
  private _rtcPeerConnections$ = this.createBehaviorSubject<RTCPeerConnectionController[]>([]);

  private _nodeId$: BehaviorSubject<string | null>;
  private _selfId$ = this.createBehaviorSubject<string | null>(null);
  private _signalingStatus$ = this.createReplaySubject<SignalingStatus>(1);
  private _screenShareStatus$ = this.createBehaviorSubject<ScreenShareStatus>('none');
  private _rtcPeerConnectionsMap = new Map<string, RTCPeerConnectionController>();
  private _screenShareId?: string;
  /** Every leg-scoped error report, so a wait on one leg can end with it. */
  private _legErrors$ = this.createSubject<{ legId: string; error: Error }>();

  constructor(
    protected webRtcCallSession: WebRTCCall,
    private readonly attachManager: AttachManager,
    private readonly deviceController: DeviceController,
    private readonly webRTCApiProvider: WebRTCApiProvider,
    options: WebRTCVertoManagerOptions = {}
  ) {
    super(webRtcCallSession);
    this._nodeId$ = this.createBehaviorSubject<string | null>(options.nodeId ?? null);
    this.onError = options.onError;
    this.onModifyFailed = options.onModifyFailed;
    this.initSubscriptions();
    this.initMainPeerConnection();
  }
  async hold(): Promise<void> {
    const vertoModifyMessage = VertoModify({
      sessid: this.webRtcCallSession.id,
      dialogParams: {
        callID: this.webRtcCallSession.id
      },
      action: 'hold'
    });

    try {
      await this.executeVerto(vertoModifyMessage);
    } catch (error) {
      logger.warn(
        '[WebRTCManager] Call might already be disconnected, error sending Verto hold:',
        error
      );
      throw error;
    }
  }
  async unhold(): Promise<void> {
    const vertoModifyMessage = VertoModify({
      sessid: this.webRtcCallSession.id,
      dialogParams: {
        callID: this.webRtcCallSession.id
      },
      action: 'unhold'
    });
    try {
      await this.executeVerto(vertoModifyMessage);
    } catch (error) {
      logger.warn(
        '[WebRTCManager] Call might already be disconnected, error sending Verto unhold:',
        error
      );
      throw error;
    }
  }

  public get mediaDirections(): MediaDirections {
    return this.mainPeerConnection.mediaDirections;
  }

  public get rtcPeerConnections$(): Observable<RTCPeerConnectionController[]> {
    return this._rtcPeerConnections$.asObservable();
  }

  public get rtcPeerConnections(): RTCPeerConnectionController[] {
    return this._rtcPeerConnections$.value;
  }

  public get nodeId$(): Observable<string | null> {
    return this._nodeId$.asObservable();
  }

  public get selfId$(): Observable<string | null> {
    return this._selfId$.asObservable();
  }

  /** Separates the media phase of call creation from the signalling phase. */
  public get localMediaSettled$(): Observable<void> {
    return this.mainPeerConnection.localMediaSettled$;
  }

  public get localStream(): MediaStream | null {
    return this._rtcPeerConnectionsMap.get(this.webRtcCallSession.id)?.localStream ?? null;
  }

  public get remoteStream(): MediaStream | null {
    return this._rtcPeerConnectionsMap.get(this.webRtcCallSession.id)?.remoteStream ?? null;
  }

  public get nodeId(): string | null {
    return this._nodeId$.value;
  }

  public get screenShareStatus(): ScreenShareStatus {
    return this._screenShareStatus$.value;
  }

  public get screenShareStatus$(): Observable<ScreenShareStatus> {
    return this._screenShareStatus$.asObservable();
  }

  public get mainPeerConnection(): RTCPeerConnectionController {
    const rtcPeerConnection = this._rtcPeerConnectionsMap.get(this.webRtcCallSession.id);
    if (!rtcPeerConnection) {
      throw new DependencyError('Main peer connection not found');
    }
    return rtcPeerConnection;
  }

  public get signalingStatus$(): Observable<SignalingStatus> {
    return this.cachedObservable('signalingStatus$', () =>
      merge(
        this._signalingStatus$.asObservable(),
        this.mainPeerConnection.connectionState$.pipe(
          filter((connectionState) =>
            ['connected', 'disconnected', 'failed'].includes(connectionState)
          )
        ) as Observable<SignalingStatus>
      )
    );
  }

  private initSubscriptions() {
    // Eagerly populate node_id and selfId from call.joined events.
    // During reattach, call.joined often arrives before the verto.invite
    // RPC response (CALL CREATED) which is the authoritative source for
    // these values. Populating them early prevents downstream RPCs
    // (e.g. call.layout.list) from failing with empty identifiers.
    this.subscribeTo(this.callJoinedEvent$, (event: CallJoinedPayload) => {
      const memberNodeId = event.room_session.members.find(
        (m) => m.call_id === event.call_id
      )?.node_id;
      if (memberNodeId) {
        this.setNodeIdIfNull(memberNodeId);
      }
      if (event.member_id) {
        this.setSelfIdIfNull(event.member_id);
      }
    });

    this.subscribeTo(this.vertoMedia$, (event: VertoMediaParams) => {
      logger.debug('[WebRTCManager] Received Verto media event (early media SDP):', event);
      const { sdp, callID } = event;
      this.emitMainSignalingStatus(callID, 'ringing');
      const rtcPeerConnController = this._rtcPeerConnectionsMap.get(callID);
      void rtcPeerConnController?.updateAnswerStatus({
        status: 'received',
        sdp: sdp
      });
    });

    this.subscribeTo(this.vertoAnswer$, (event: VertoAnswerParams) => {
      logger.debug('[WebRTCManager] Received Verto answer event:', event);
      const { sdp, callID } = event;
      this.emitMainSignalingStatus(callID, 'connecting');
      const rtcPeerConnController = this._rtcPeerConnectionsMap.get(callID);
      void rtcPeerConnController?.updateAnswerStatus({
        status: 'received',
        sdp: sdp
      });
    });

    this.subscribeTo(this.vertoMediaParams$, (event: VertoMediaParamsParams) => {
      logger.debug('[WebRTCManager] Received Verto mediaParams event:', event);

      const { mediaParams, callID } = event;
      const rtcPeerConnController = this._rtcPeerConnectionsMap.get(callID);
      const { audio, video } = mediaParams;

      if (!rtcPeerConnController) {
        // Emitting mediaParamsUpdated here would claim the constraints were
        // applied when no sender was touched.
        logger.warn(
          `[WebRTCManager] Ignoring server-pushed media params for unknown leg ${callID}`
        );
        return;
      }

      void this.applyServerMediaParams(rtcPeerConnController, audio, video);
    });

    this.subscribeTo(this.vertoPing$, (vertoPing: VertoPingParams) => {
      void this.attachManager.refresh(this.buildAttachableCall());
      void this.sendVertoPong(vertoPing);
    });
  }

  /**
   * An auxiliary-leg failure must never destroy the call; main-leg and
   * call-level errors keep `CallFactory.isFatalError`'s classification.
   *
   * Every site holding a peer connection reports through here, so the invariant
   * is structural rather than per-call-site — which is how cloud-product#20523
   * happened, with only one of fourteen sites passing `{ fatal: false }`.
   *
   * `override` composes rather than replaces: a caller may force non-fatal for a
   * reason of its own (a `verto.info` frame is best-effort whichever leg carries
   * it), and an auxiliary leg stays non-fatal regardless.
   */
  private reportLegError(
    error: Error,
    rtcPeerConnController?: RTCPeerConnectionController | null,
    override?: { fatal?: boolean }
  ): void {
    const leg = rtcPeerConnController?.propose;
    const legId = rtcPeerConnController?.id;
    const auxiliary = Boolean(rtcPeerConnController) && !rtcPeerConnController?.isMainDevice;
    this.onError?.(error, {
      ...(override?.fatal === false || auxiliary ? { fatal: false } : {}),
      ...(leg ? { leg } : {}),
      ...(legId ? { legId } : {})
    });
    if (legId) {
      this._legErrors$.next({ legId, error });
    }
  }

  /**
   * Errors reported for one leg, as a stream that fails with them.
   *
   * Signaling failures are reported, never thrown — so nothing that waits on a
   * leg's progress would otherwise learn of a rejected invite. Merging this in
   * lets the wait end with the reason the server gave.
   */
  private legError$(legId: string): Observable<never> {
    return this._legErrors$.pipe(
      filter((report) => report.legId === legId),
      map((report) => {
        throw report.error;
      })
    );
  }

  /**
   * Audio and video are applied independently so a failure in one cannot
   * suppress the other, and `mediaParamsUpdated` is emitted whatever happens —
   * an application should not be starved of the params by a constraint failure.
   */
  private async applyServerMediaParams(
    rtcPeerConnController: RTCPeerConnectionController,
    audio: MediaTrackConstraints | undefined,
    video: MediaTrackConstraints | undefined
  ): Promise<void> {
    const failures: Error[] = [];
    // Every way the params can fail to reach the wire has to reach `applied`:
    // a throw here, and — far more common — a leg that reports it left the
    // media alone or could not constrain it.
    let applied = true;

    if (audio) {
      try {
        applied = (await rtcPeerConnController.updateSendersConstraints('audio', audio)) && applied;
      } catch (error) {
        applied = false;
        failures.push(toError(error));
      }
    }

    if (video) {
      try {
        applied = (await rtcPeerConnController.updateSendersConstraints('video', video)) && applied;
      } catch (error) {
        applied = false;
        failures.push(toError(error));
      }
    }

    this.webRtcCallSession.emitMediaParamsUpdated({
      audio,
      video,
      timestamp: Date.now(),
      applied
    });

    for (const failure of failures) {
      logger.warn('[WebRTCManager] Error applying server-pushed media params:', failure);
      // A push the media could not take is not a reason to end the call.
      this.reportLegError(failure, rtcPeerConnController, { fatal: false });
    }
  }

  /**
   * Set node_id/selfId only when the current value is null.
   *
   * During reattach, `call.joined` and `verto.answer` events can deliver
   * these identifiers before the `verto.invite` RPC response (`CALL CREATED`)
   * arrives. These methods let early events populate them eagerly so that
   * downstream RPC calls (e.g. `call.layout.list`) don't fail with empty
   * identifiers. `processInviteResponse()` remains the authoritative source and
   * overwrites unconditionally — for selfId, on the main leg only.
   */
  private setNodeIdIfNull(nodeId: string): void {
    if (!this._nodeId$.value && nodeId) {
      logger.debug(`[WebRTCManager] Early node_id set: ${nodeId}`);
      this._nodeId$.next(nodeId);
    }
  }

  private setSelfIdIfNull(selfId: string): void {
    if (!this._selfId$.value && selfId) {
      logger.debug(`[WebRTCManager] Early selfId set: ${selfId}`);
      this._selfId$.next(selfId);
    }
  }

  private async sendVertoPong(vertoPing: VertoPingParams) {
    try {
      const vertoPongMessage = VertoPong({
        ...vertoPing
      });
      await this.executeVerto(vertoPongMessage);
    } catch (error) {
      logger.warn('[WebRTCManager] Call might disconnect, error sending Verto pong:', error);
      this.onError?.(new VertoPongError(error));
    }
  }

  /**
   * @returns whether the constraints reached the media the call is sending.
   * `false` is an outcome, not a failure: the leg may have no live sender of
   * the kind, or carry media the SDK did not capture and may not replace.
   * A failure behind it still reaches the call's `errors$`, so a caller that
   * ignores this value learns of it there.
   */
  public async updateMediaConstraints(
    options: {
      audio?: MediaTrackConstraints;
      video?: MediaTrackConstraints;
    } = {}
  ): Promise<boolean> {
    const { audio, video } = options;
    let applied = true;
    try {
      if (audio) {
        applied =
          (await this.mainPeerConnection.updateSendersConstraints('audio', audio)) && applied;
      }
      if (video) {
        applied =
          (await this.mainPeerConnection.updateSendersConstraints('video', video)) && applied;
      }
    } catch (error) {
      logger.warn('[WebRTCManager] Error updating media constraints:', error);
      this.reportLegError(toError(error), this.mainPeerConnection);
      throw error;
    }
    return applied;
  }

  public get selfId(): string | null {
    return this._selfId$.value;
  }

  /** Build an AttachableCall from the current call state. */
  private buildAttachableCall(idOverride?: string, nodeIdOverride?: string) {
    return {
      nodeId: nodeIdOverride ?? this.nodeId ?? undefined,
      id: idOverride ?? this.webRtcCallSession.id,
      to: this.webRtcCallSession.to,
      mediaDirections: this.webRtcCallSession.mediaDirections
    };
  }

  /**
   * Request a video keyframe via RTCP PLI/FIR.
   *
   * Uses RTCRtpReceiver.requestKeyFrame() (Chrome 124+) to send a
   * Picture Loss Indication to the remote sender. This is a client-side
   * WebRTC operation — no server RPC is needed.
   *
   * Best-effort: logs a warning on failure, never emits on errors$.
   */
  public requestKeyframe(): void {
    try {
      const pc = this.mainPeerConnection.peerConnection;
      if (!pc) {
        logger.warn('[WebRTCManager] No peer connection for keyframe request');
        return;
      }

      const videoReceiver = pc.getReceivers().find((r) => r.track.kind === 'video');
      if (!videoReceiver) {
        logger.warn('[WebRTCManager] No video receiver for keyframe request');
        return;
      }

      // RTCRtpReceiver.requestKeyFrame() sends a PLI/FIR via RTCP (Chrome 124+)
      if (
        typeof (videoReceiver as unknown as { requestKeyFrame?: () => void }).requestKeyFrame ===
        'function'
      ) {
        (videoReceiver as unknown as { requestKeyFrame: () => void }).requestKeyFrame();
        logger.debug('[WebRTCManager] Keyframe requested via RTCRtpReceiver.requestKeyFrame()');
      } else {
        logger.debug('[WebRTCManager] requestKeyFrame() not supported, skipping');
      }
    } catch (error) {
      logger.warn('[WebRTCManager] Keyframe request failed (non-fatal):', error);
    }
  }

  /**
   * Request an ICE restart via the controller's negotiation pipeline.
   *
   * Triggers an ICE restart offer on the controller, which goes through the
   * full SDP pipeline: createOffer → setLocalDescription → ICE gathering →
   * localDescription$ emission → setupLocalDescriptionHandler sends verto.modify.
   *
   * This ensures the SDP sent to the server has fully gathered ICE candidates,
   * real ports/IPs, and any configured SDP munging applied — matching the
   * same pipeline used for the initial verto.invite.
   */
  public async requestIceRestart(relayOnly?: boolean): Promise<void> {
    try {
      const controller = this.mainPeerConnection;
      if (!controller.peerConnection) {
        logger.warn('[WebRTCManager] No peer connection for ICE restart');
        return;
      }

      await controller.triggerIceRestart(relayOnly);
      logger.info(`[WebRTCManager] ICE restart initiated${relayOnly ? ' (relay-only)' : ''}`);
    } catch (error) {
      logger.error('[WebRTCManager] ICE restart failed:', error);
      throw error;
    }
  }

  /**
   * Request an ICE restart on ALL active peer connections (main + additional legs).
   *
   * Screen share and additional device legs each get their own ICE restart
   * via the controller's negotiation pipeline. The SDP flows through
   * localDescription$ → setupLocalDescriptionHandler → verto.modify,
   * ensuring ICE gathering completes before the offer is sent.
   *
   * @param relayOnly - If true, constrain to TURN relay candidates only (Tier 3).
   */
  public async requestIceRestartAll(relayOnly?: boolean): Promise<void> {
    const entries = Array.from(this._rtcPeerConnectionsMap.entries());
    for (const [id, controller] of entries) {
      try {
        if (!controller.peerConnection) {
          logger.debug(`[WebRTCManager] No peer connection for leg ${id}, skipping ICE restart`);
          continue;
        }

        await controller.triggerIceRestart(relayOnly);
        logger.info(
          `[WebRTCManager] ICE restart initiated for leg ${id}${relayOnly ? ' (relay-only)' : ''}`
        );
      } catch (error) {
        logger.warn(`[WebRTCManager] ICE restart failed for leg ${id}:`, error);
      }
    }
  }

  /**
   * Request a keyframe on video-receiving legs only.
   *
   * Screen share legs are send-only (getDisplayMedia) so they have no
   * video receiver to request a keyframe from — they are skipped.
   */
  public requestKeyframeAll(): void {
    for (const [id, controller] of this._rtcPeerConnectionsMap) {
      if (controller.isScreenShare) {
        logger.debug(`[WebRTCManager] Skipping keyframe for send-only screen share leg ${id}`);
        continue;
      }

      try {
        const pc = controller.peerConnection;
        if (!pc) continue;

        const videoReceiver = pc.getReceivers().find((r) => r.track.kind === 'video');
        if (!videoReceiver) continue;

        if (
          typeof (videoReceiver as unknown as { requestKeyFrame?: () => void }).requestKeyFrame ===
          'function'
        ) {
          (videoReceiver as unknown as { requestKeyFrame: () => void }).requestKeyFrame();
          logger.debug(`[WebRTCManager] Keyframe requested for leg ${id}`);
        }
      } catch (error) {
        logger.warn(`[WebRTCManager] Keyframe request failed for leg ${id} (non-fatal):`, error);
      }
    }
  }

  private get callJoinedEvent$() {
    return this.webRtcCallSession.callEvent$.pipe(
      filter(isCallJoinedPayload),
      takeUntil(this.destroyed$)
    );
  }

  private get vertoMedia$() {
    return this.webRtcCallSession.webrtcMessages$.pipe(
      filterAs(isVertoMediaInnerParams, 'params'),
      takeUntil(this.destroyed$)
    );
  }

  private get vertoAnswer$() {
    return this.cachedObservable('vertoAnswer$', () =>
      this.webRtcCallSession.webrtcMessages$.pipe(
        filterAs(isVertoAnswerInnerParams, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  private get vertoMediaParams$() {
    return this.cachedObservable('vertoMediaParams$', () =>
      this.webRtcCallSession.webrtcMessages$.pipe(
        filterAs(isVertoMediaParamsInnerParams, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  private get vertoBye$() {
    return this.cachedObservable('vertoBye$', () =>
      this.webRtcCallSession.webrtcMessages$.pipe(
        filterAs(isVertoByeInboundMessage, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  private get vertoAttach$() {
    return this.cachedObservable('vertoAttach$', () =>
      this.webRtcCallSession.webrtcMessages$.pipe(
        filterAs(isVertoAttachMessage, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  private get vertoPing$() {
    return this.cachedObservable('vertoPing$', () =>
      this.webRtcCallSession.webrtcMessages$.pipe(
        filterAs(isVertoPingInnerParams, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /**
   * Send a member-control op in-dialog via verto.info.
   *
   * The control payload rides in `params.command` — a sibling of `dialogParams`,
   * at the same level as `dtmf` in {@link sendDigits} — and the inner verto.info
   * is matched to this call's channel by `dialogParams.callID`, the in-dialog
   * convention for member-scoped frames. Because it is delivered on the dialog
   * itself, control lands on the call's own channel with no {node_id,call_id,member_id}
   * "self" tuple to get wrong. The outer webrtc.verto envelope (added by executeVerto)
   * still carries the own-leg callID + node_id for session routing.
   *
   * Keep `command` OUT of `dialogParams`: it is read at the params level, and
   * filterVertoParams rewrites/filters dialogParams keys but passes params-level
   * keys through verbatim.
   */
  public async sendCallControl(
    method: string,
    params: Record<string, unknown>
  ): Promise<JSONRPCResponse<unknown>> {
    const response = await this.executeVerto(
      VertoInfo({
        dialogParams: {
          callID: this.webRtcCallSession.id
        },
        command: { method, params }
      })
    );
    // A member-control command reports success/failure as a verto-style `code` buried in
    // nested `.result` envelopes (see findNestedVertoFailure) — a shape executeVerto does
    // not treat as an error at all, so it must be surfaced here. Reject the promise so
    // callers handle it locally: CallEventsManager.updateLayouts .catch()es it;
    // Participant.mute/kick etc. are awaited with try/catch.
    //
    // A rejected control op must never kill the call. That is enforced in executeVerto,
    // which reports ANY verto.info failure non-fatally — including the JSONRPC-`error`
    // shape that never reaches the check below.
    const failure = findNestedVertoFailure(response);
    if (failure) {
      // JSONRPCError's `code` is numeric, so a non-numeric server code cannot be
      // represented there — always carry the raw code in the message so it is not
      // lost when the server also sends a `message`.
      throw new JSONRPCError(
        Number.parseInt(failure.code, 10) || 0,
        `Call control "${method}" failed (code ${failure.code})${failure.message ? `: ${failure.message}` : ''}`,
        undefined
      );
    }
    return response;
  }

  private async executeVerto(
    message: VertoRPCMessage,
    optionals: ExecuteVertoOptions = {}
  ): Promise<JSONRPCResponse<unknown>> {
    const params = {
      callID: optionals.callID ?? this.webRtcCallSession.id,

      node_id: optionals.node_id ?? this._nodeId$.value ?? '',
      message,
      subscribe: optionals.subscribe
    };

    const webrtcVertoMessage = WebrtcVerto(params);

    const response = await this.webRtcCallSession.execute(webrtcVertoMessage);

    // A verto.info is a best-effort IN-DIALOG frame (DTMF via sendDigits, member control
    // via sendCallControl). Its failure means "that op did not happen" — never "the call
    // is dead"; the authoritative death signals are verto.bye and call.state. So report
    // it non-fatally: CallFactory otherwise falls back to isFatalError(), which treats a
    // JSONRPCError as fatal, and Call.emitError would then mark the call failed, send bye
    // and destroy it. A rejected mute or DTMF digit must not tear down the call.
    //
    // Keyed off the method rather than a per-call-site option so it holds for every
    // verto.info sender, including future ones. Signaling-critical frames
    // (verto.invite/modify/bye) keep the default fatal classification.
    const nonFatal = message.method === 'verto.info' ? { fatal: false } : undefined;

    // The server states a failure either at the top level or nested under result.result,
    // where the webrtc.verto envelope wraps the inner verto response.
    const innerResult = getValueFrom<{ error?: { code: number; message: string; data?: unknown } }>(
      response,
      'result.result'
    );
    const failure = response.error ?? innerResult?.error;
    if (failure) {
      const error = new JSONRPCError(failure.code, failure.message, failure.data);
      // verto.invite and verto.answer are the frames whose sender owns the failure:
      // sendLocalDescription (or, for verto.answer, sendLocalDescriptionOnceAccepted)
      // catches it and reports once, with the leg's identity and fatality. Reporting
      // here as well would report it twice, and the second report — a bare Error from
      // processInviteResponse, which cannot see a nested failure — is fatal whatever code
      // the server sent, including the recoverable ones the session re-authenticates for.
      if (message.method === 'verto.invite' || message.method === 'verto.answer') {
        throw error;
      }
      this.reportLegError(error, this._rtcPeerConnectionsMap.get(params.callID), nonFatal);
    }

    return response;
  }

  private async sendLocalDescription(
    message: VertoRPCMessage,
    rtcPeerConnController: RTCPeerConnectionController
  ): Promise<void> {
    const vertoMethod: VertoMethod = message.method;

    const optionalsParams = this.getSendLocalSDPOptionalParams(rtcPeerConnController, message);

    try {
      const response = await this.executeVerto(message, optionalsParams);

      switch (vertoMethod) {
        case 'verto.invite':
          this.processInviteResponse(response, rtcPeerConnController);
          break;
        case 'verto.modify':
          await this.processModifyResponse(response, rtcPeerConnController);
          break;
        default:
      }
    } catch (error) {
      // A refused verto.answer is sendLocalDescriptionOnceAccepted's to report and
      // mark 'failed' — rethrow so it doesn't land here as a false 'sent'.
      if (vertoMethod === 'verto.answer') {
        throw error;
      }
      // The one place a failed send is reported: execute() can reject before
      // executeVerto inspects the response, and executeVerto throws a refused invite
      // to here rather than returning it for processInviteResponse to re-diagnose.
      logger.error(`[WebRTCManager] Error sending Verto ${vertoMethod}:`, error);
      this.reportLegError(toError(error), rtcPeerConnController);
      if (vertoMethod === 'verto.modify') {
        this.onModifyFailed?.();
      }
    }
  }
  private async processModifyResponse(
    response: JSONRPCResponse<unknown>,
    rtcPeerConnController: RTCPeerConnectionController
  ) {
    if (!response.error) {
      const action = getValueFrom<string>(response, 'result.result.result.action');
      const sdp = getValueFrom<string>(response, 'result.result.result.sdp');
      if (action === 'updateMedia' && !!sdp) {
        try {
          await rtcPeerConnController.updateAnswerStatus({
            status: 'received',
            sdp
          });
        } catch (error) {
          logger.warn('[WebRTCManager] Error processing modify response:', error);
          const modifyError =
            error instanceof Error ? error : new Error(String(error), { cause: error });
          this.reportLegError(modifyError, rtcPeerConnController);
        }
      }
    }
  }

  private emitMainSignalingStatus(callId: string, status: SignalingStatus): void {
    const rtcPeerConnController = this._rtcPeerConnectionsMap.get(callId);
    if (!rtcPeerConnController) {
      const signalingError = new DependencyError(
        `Cannot emit signaling status, RTCPeerConnectionController not found for callID: ${callId}`
      );
      logger.error('[WebRTCManager] Failed to emit signaling status:', {
        callId,
        status,
        signalingError
      });
      // A failed auxiliary leg is now removed from the registry, so a late
      // verto.answer/verto.media for it lands here. There is no leg left to
      // report against and no status to emit — never a reason to end the call.
      this.reportLegError(signalingError, null, { fatal: false });
      return;
    }

    if (rtcPeerConnController.isMainDevice) {
      this._signalingStatus$.next(status);
    }
  }

  private processInviteResponse(
    response: JSONRPCResponse<unknown>,
    rtcPeerConnController: RTCPeerConnectionController
  ) {
    if (getValueFrom(response, 'result.result.result.message') === 'CALL CREATED') {
      this.emitMainSignalingStatus(rtcPeerConnController.id, 'trying');
      const nodeId = getValueFrom<string>(response, 'result.node_id') ?? null;
      const memberId = getValueFrom<string>(response, 'result.result.result.memberID') ?? null;
      const callId = getValueFrom<string>(response, 'result.result.result.callID');
      logger.debug('[WebRTCManager] Verto invite response:', { callId, memberId, response });

      // An auxiliary leg invite goes out with node_id '' ("server picks") and joins
      // the conference as its OWN member, so the response names a member and a node
      // that are the LEG's, not the call's. Keep them on the leg: `selfId`/`nodeId`
      // are what Call.callSelf sends as the `self`/`target` of every member RPC, and
      // what every main-leg frame is routed by.
      rtcPeerConnController.setMemberId(memberId);
      rtcPeerConnController.setNodeId(nodeId);
      if (rtcPeerConnController.isMainDevice) {
        this._selfId$.next(memberId);
        this._nodeId$.next(nodeId);
        void this.attachManager.attach(this.buildAttachableCall(callId, nodeId ?? undefined));
      }
      if (callId) {
        this.webRtcCallSession.addCallId(callId);
      }
      logger.info('[WebRTCManager] Verto invite successful');
      logger.debug(
        `[WebRTCManager] nodeid: ${this._nodeId$.value}, selfId: ${this._selfId$.value}`
      );
    } else {
      logger.error('[WebRTCManager] Verto invite failed:', response);
      // A refusal never reaches here — executeVerto throws it to sendLocalDescription,
      // which reports it with the code the server sent. What is left is a response that
      // states no error and still is not the 'CALL CREATED' the invite asked for.
      this.reportLegError(
        new Error('Verto invite failed: unexpected response'),
        rtcPeerConnController
      );
    }
  }

  private get RTCPeerConnectionConfig() {
    return {
      iceServers:
        this.webRtcCallSession.clientSession.iceServers ?? PreferencesContainer.instance.iceServers,
      relayOnly:
        PreferencesContainer.instance.relayOnly ||
        PreferencesContainer.instance.disableUdpIceServers,
      disableUdpIceServers: PreferencesContainer.instance.disableUdpIceServers,
      iceCandidateTimeout: PreferencesContainer.instance.iceCandidateTimeout,
      iceGatheringTimeout: PreferencesContainer.instance.iceGatheringTimeout
    };
  }

  private initMainPeerConnection() {
    //if (this.webRtcCallSession.direction === 'outbound') {
    const { options } = this.webRtcCallSession;
    const rtcPeerConnController = new RTCPeerConnectionController(
      {
        propose: 'main',
        callId: this.webRtcCallSession.id,
        audio: options.audio,
        video: options.video,
        inputAudioDeviceConstraints: options.inputAudioDeviceConstraints,
        inputVideoDeviceConstraints: options.inputVideoDeviceConstraints,
        inputAudioStream: options.inputAudioStream,
        inputVideoStream: options.inputVideoStream,
        receiveAudio: options.receiveAudio,
        receiveVideo: options.receiveVideo,
        fallbackToReceiveOnly: options.fallbackToReceiveOnly,
        webRTCApiProvider: this.webRTCApiProvider,
        preferredVideoCodecs: options.preferredVideoCodecs,
        preferredAudioCodecs: options.preferredAudioCodecs,
        stereo: options.stereo,
        ...this.RTCPeerConnectionConfig
      },
      options.initOffer,
      this.deviceController
    );
    this.setupLocalDescriptionHandler(rtcPeerConnController);
    this.setupVertoByeHandler();
    this.setupVertoAttachHandler();
    this.initObservables(rtcPeerConnController);
    this._rtcPeerConnectionsMap.set(rtcPeerConnController.id, rtcPeerConnController);
    this._rtcPeerConnections$.next(Array.from(this._rtcPeerConnectionsMap.values()));
    this.subscribeTo(rtcPeerConnController.errors$, (error) => {
      this.reportLegError(error, rtcPeerConnController);
    });

    // For inbound calls, wait for answer()/reject() then trigger SDP answer creation
    if (options.initOffer) {
      void this.handleInboundAnswer(rtcPeerConnController);
    }
  }

  private async handleInboundAnswer(
    rtcPeerConnController: RTCPeerConnectionController
  ): Promise<void> {
    logger.debug('[WebRTCManager] Waiting for inbound call to be accepted or rejected');
    const vertoByeOrAccepted: boolean | VertoByeInboundParams | null = await firstValueFrom(
      race(this.vertoBye$, this.webRtcCallSession.answered$).pipe(takeUntil(this.destroyed$))
    ).catch(() => null);

    if (vertoByeOrAccepted === null) {
      logger.debug('[WebRTCManager] Inbound answer handler aborted (destroyed).');
      return;
    }

    if (isVertoByeInboundParamsGuard(vertoByeOrAccepted)) {
      logger.info('[WebRTCManager] Inbound call ended by remote before answer.');
      this.callSession?.destroy();
    } else if (!vertoByeOrAccepted) {
      logger.info('[WebRTCManager] Inbound call rejected by user.');
      try {
        await this.bye('USER_BUSY');
      } finally {
        this._signalingStatus$.next('disconnected');
        this.callSession?.destroy();
      }
    } else {
      logger.debug('[WebRTCManager] Inbound call accepted, creating SDP answer');
      const answerOptions: MediaOptions | undefined = this.webRtcCallSession.answerMediaOptions;
      try {
        await rtcPeerConnController.acceptInbound(answerOptions);
      } catch (error) {
        logger.error('[WebRTCManager] Error creating inbound answer:', error);
        this.reportLegError(toError(error), rtcPeerConnController);
      }
    }
  }

  private setupVertoAttachHandler(): void {
    this.subscribeTo(this.vertoAttach$, async (vertoAttach: VertoAttachParams) => {
      logger.debug('[WebRTCManager] Received Verto attach event for existing call:', vertoAttach);
      const { callID } = vertoAttach;
      await this.attachManager.attach({
        nodeId: this.nodeId ?? undefined,
        id: callID,
        to: vertoAttach.callee_id_number,
        mediaDirections: {
          audio: 'sendrecv',
          // this might be changed in future to support video attach, but this feature was originally supposed in the non-video SDK.
          video: 'inactive'
        }
      });
    });
  }

  private initObservables(rtcPeerConnController: RTCPeerConnectionController): void {
    this.mediaDirections$ = rtcPeerConnController.connectionState$.pipe(
      filter((state) => state === 'connected'),
      map(() => rtcPeerConnController.mediaDirections),
      startWith(rtcPeerConnController.mediaDirections),
      takeUntil(this.destroyed$)
    );
    this.localStream$ = rtcPeerConnController.localStream$.pipe(
      filterNull(),
      takeUntil(this.destroyed$)
    );
    this.remoteStream$ = rtcPeerConnController.remoteStream$.pipe(
      filterNull(),
      takeUntil(this.destroyed$)
    );
  }
  private setupLocalDescriptionHandler(rtcPeerConnController: RTCPeerConnectionController): void {
    this.subscribeTo(
      // watch for local description from the RTCPeerConnection and send it to remote peer
      rtcPeerConnController.localDescription$.pipe(
        // Filter out null descriptions
        filter((description): description is RTCSessionDescription => description !== null),
        takeUntil(this.destroyed$)
      ),
      (description) => {
        const { type, sdp } = description;
        const dialogParams = this.dialogParams(rtcPeerConnController);
        const initial = !rtcPeerConnController.firstSDPExchangeCompleted;
        if (type === 'answer') {
          {
            const vertoMessageRequest = VertoAnswer({
              dialogParams,
              sdp: sdp
            });
            void this.sendLocalDescriptionOnceAccepted(vertoMessageRequest, rtcPeerConnController);
          }
        } else if (initial) {
          const vertoMessageRequest = VertoInvite({
            dialogParams,
            sdp
          });
          void this.sendLocalDescription(vertoMessageRequest, rtcPeerConnController);
        } else {
          const vertoMessageRequest = VertoModify({
            dialogParams,
            sdp,
            action: 'updateMedia'
          });
          void this.sendLocalDescription(vertoMessageRequest, rtcPeerConnController);
        }
      }
    );
  }

  private setupVertoByeHandler() {
    this.subscribeTo(this.vertoBye$, () => {
      this._signalingStatus$.next('disconnected');
      void this.attachManager.detach(this.buildAttachableCall());
      this.callSession?.destroy();
    });
  }

  private getSendLocalSDPOptionalParams(
    rtcPeerConnController: RTCPeerConnectionController,
    vertoMessage: VertoRPCMessage
  ): ExecuteVertoOptions {
    let subscribe = undefined;
    const initial = !rtcPeerConnController.firstSDPExchangeCompleted;
    if (initial) {
      subscribe = [];
      if (rtcPeerConnController.isMainDevice) {
        subscribe.push(...PreferencesContainer.instance.inviteSubscribeMainDevice);
      } else if (rtcPeerConnController.isAdditionalDevice) {
        subscribe.push(...PreferencesContainer.instance.inviteSubscribeAdditionalDevice);
      } else if (rtcPeerConnController.isScreenShare) {
        subscribe.push(...PreferencesContainer.instance.inviteSubscribeScreenshare);
      }
    }
    const optionalsParams = {
      callID: rtcPeerConnController.id,
      node_id: resolveInviteNodeId({
        isInvite: isVertoInviteMessage(vertoMessage),
        reattach: this.webRtcCallSession.options.reattach === true,
        explicitNodeId: this.webRtcCallSession.options.nodeId,
        currentNodeId: rtcPeerConnController.nodeId ?? this._nodeId$.value
      }),
      subscribe
    };
    return optionalsParams;
  }

  async sendLocalDescriptionOnceAccepted(
    vertoMessageRequest: VertoRPCMessage,
    rtcPeerConnectionController: RTCPeerConnectionController
  ): Promise<void> {
    logger.debug('[WebRTCManager] Waiting for call to be accepted or ended before sending answer');
    const vertoByeOrAccepted: boolean | VertoByeInboundParams | null = await firstValueFrom(
      race(this.vertoBye$, this.webRtcCallSession.answered$).pipe(takeUntil(this.destroyed$))
    ).catch(() => null);

    if (vertoByeOrAccepted === null) {
      logger.debug('[WebRTCManager] Destroyed while waiting for call acceptance');
      return;
    }

    if (isVertoByeInboundParamsGuard(vertoByeOrAccepted)) {
      logger.info('[WebRTCManager] Call ended before answer was sent.');
      this.callSession?.destroy();
    } else if (!vertoByeOrAccepted) {
      logger.info('[WebRTCManager] Call was not accepted, sending verto.bye.');
      try {
        await this.bye('USER_BUSY');
      } finally {
        this._signalingStatus$.next('disconnected');
        this.callSession?.destroy();
      }
    } else {
      logger.debug('[WebRTCManager] Call accepted, sending answer');
      try {
        this.emitMainSignalingStatus(rtcPeerConnectionController.id, 'connecting');
        await this.sendLocalDescription(vertoMessageRequest, rtcPeerConnectionController);
        await rtcPeerConnectionController.updateAnswerStatus({
          status: 'sent'
        });
        await this.attachManager.attach(this.buildAttachableCall());
      } catch (error) {
        logger.error('[WebRTCManager] Error sending Verto answer:', error);
        this.reportLegError(toError(error), rtcPeerConnectionController);
        await rtcPeerConnectionController.updateAnswerStatus({
          status: 'failed'
        });
      }
    }
  }

  dialogParams(rtcPeerConnectionController: RTCPeerConnectionController): Record<string, unknown> {
    const memberId = rtcPeerConnectionController.memberId ?? this._selfId$.value ?? undefined;
    const attach =
      rtcPeerConnectionController.propose === 'main' &&
      !rtcPeerConnectionController.firstSDPExchangeCompleted &&
      this.webRtcCallSession.options.reattach;

    return {
      id: rtcPeerConnectionController.isMainDevice
        ? this.webRtcCallSession.id
        : rtcPeerConnectionController.id,
      destinationNumber: this.webRtcCallSession.to ?? this.webRtcCallSession.from,
      attach,
      reattaching: attach,
      callerName: this.webRtcCallSession.fromName,
      callerNumber: this.webRtcCallSession.from,
      remoteCallerName: this.webRtcCallSession.toName,
      remoteCallerNumber: this.webRtcCallSession.to,
      userVariables: {
        memberCallId: this.webRtcCallSession.id,
        memberId,
        ...this.webRtcCallSession.userVariables
      },
      screenShare: rtcPeerConnectionController.isScreenShare,
      additionalDevice: rtcPeerConnectionController.isAdditionalDevice,
      pingSupported: true,
      version: INVITE_VERSION
    };
  }

  public muteMainAudioInputDevice(): void {
    return this.mainPeerConnection.stopTrackSender('audio');
  }

  public muteMainVideoInputDevice(): void {
    return this.mainPeerConnection.stopTrackSender('video');
  }

  public async unmuteMainAudioInputDevice(): Promise<void> {
    return this.mainPeerConnection.restoreTrackSender('audio');
  }

  public async unmuteMainVideoInputDevice(): Promise<void> {
    return this.mainPeerConnection.restoreTrackSender('video');
  }

  /** Get or lazily create the local audio pipeline for the main peer connection. */
  public ensureLocalAudioPipeline(): LocalAudioPipeline | null {
    return this.mainPeerConnection.ensureLocalAudioPipeline();
  }

  /** The currently-active local audio pipeline, or null if it hasn't been created. */
  public get localAudioPipeline(): LocalAudioPipeline | null {
    return this.mainPeerConnection.localAudioPipeline;
  }

  public async addInputDevice(
    options: MediaOptions = { audio: false, video: true }
  ): Promise<string | undefined> {
    return this.initAdditionalPeerConnection('additional-device', options);
  }

  /**
   * Add a new input device to the main peer connection,
   * only if a device of the same kind is not present already.
   *
   * @see selectAudioInputDevice
   * @see selectVideoInputDevice
   * @param options - Media options specifying which input devices to add (defaults to audio only).
   */
  public async addMainInputDevices(options: MediaOptions = { audio: true }): Promise<void> {
    let deviceKind: 'audio' | 'video' | 'both' | undefined = undefined;

    const { mediaDirections } = this.mainPeerConnection;

    if (
      options.audio ??
      options.inputAudioDeviceConstraints ??
      (options.inputAudioStream && mediaDirections.audio.startsWith('send'))
    ) {
      deviceKind = 'audio';
    }
    if (
      options.video ??
      options.inputVideoDeviceConstraints ??
      (options.inputVideoStream && !mediaDirections.video.startsWith('send'))
    ) {
      deviceKind = deviceKind === 'audio' ? 'both' : 'video';
    }
    if (deviceKind) {
      this.mainPeerConnection.updateMediaDevicesOptions(options);
      await this.mainPeerConnection.restoreTrackSender(deviceKind);
    } else {
      const error = new InvalidParams('No valid device to be added');
      // Main leg: CallFactory.isFatalError decides; this only attaches leg identity.
      this.reportLegError(error, this.mainPeerConnection);
      throw error;
    }
  }

  public async addScreenMedia(options: ScreenShareOptions = {}): Promise<void> {
    // `audio: false` keeps the share off the microphone; the surface's own
    // audio is a separate request the display capture reads directly.
    await this.initAdditionalPeerConnection('screenshare', {
      audio: false,
      screenShareAudio: options.audio ?? false
    });
  }

  private async initAdditionalPeerConnection(
    propose: RTCPeerConnectionPropose,
    options: Omit<RTCPeerConnectionControllerOptionsPartial, 'propose'>
  ): Promise<string | undefined> {
    const isScreenShare = propose === 'screenshare';
    // `_screenShareId` is the only handle to a share, so entering again would
    // overwrite it and leave the first capture running with nothing able to
    // stop it. Thrown before the try, whose shared catch would otherwise reset
    // the live share's status; the registry check keeps a stale id from
    // wedging screen share for the rest of the call.
    if (
      isScreenShare &&
      this._screenShareId &&
      this._rtcPeerConnectionsMap.has(this._screenShareId)
    ) {
      throw new ScreenShareAlreadyActiveError(this._screenShareId);
    }
    let firstPeerConnectionError: Error | undefined;
    let rtcPeerConnController: RTCPeerConnectionController | null = null;
    try {
      if (isScreenShare) {
        this._screenShareStatus$.next('starting');
      }
      rtcPeerConnController = new RTCPeerConnectionController(
        {
          ...options,
          ...this.RTCPeerConnectionConfig,
          propose,
          webRTCApiProvider: this.webRTCApiProvider
        },
        undefined,
        this.deviceController
      );
      this.setupLocalDescriptionHandler(rtcPeerConnController);
      if (isScreenShare) {
        this._screenShareId = rtcPeerConnController.id;
      }
      this._rtcPeerConnectionsMap.set(rtcPeerConnController.id, rtcPeerConnController);
      this._rtcPeerConnections$.next(Array.from(this._rtcPeerConnectionsMap.values()));
      this.subscribeTo(rtcPeerConnController.errors$, (error) => {
        // Forward auxiliary errors with their real type (the controller
        // already emits typed MediaAccessError for acquisition failures) but
        // never fatal: an auxiliary leg failure must not destroy the call.
        firstPeerConnectionError ??= error;
        this.reportLegError(error, rtcPeerConnController);
      });
      // Acquisition is unbounded — a screen-share picker is human time, and the
      // human may take as long as they like. Only the connect that follows it is
      // bounded — the same budget for either leg kind.
      const pc = rtcPeerConnController;
      await firstValueFrom(
        merge(
          pc.localMediaSettled$.pipe(
            take(1),
            switchMap(() =>
              pc.connectionState$.pipe(
                filter((state) => state === 'connected'),
                take(1),
                timeout(DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS)
              )
            )
          ),
          // A rejected invite or a failed SDP send is reported rather than
          // thrown, and never reaches the controller's errors$ — so without
          // this the leg would wait out the whole connect budget and then
          // report a bare timeout instead of the reason the server gave.
          this.legError$(pc.id)
        ).pipe(
          // Must stay AFTER timeout(): that ordering is what surfaces a
          // destroy-during-wait as EmptyError, handled below as a benign cancel.
          // Both lifetimes belong here: branch A is leg-scoped and completes
          // when the leg is destroyed, but legError$ is manager-scoped and
          // would hold the merge open for the rest of the call.
          takeUntil(merge(this.destroyed$, pc.destroyed$))
        )
      );
      if (isScreenShare) {
        this._screenShareStatus$.next('started');
      }
      logger.info(`[WebRTCManager] Additional peer connection connected (${propose}).`);
      return rtcPeerConnController.id;
    } catch (error) {
      const cancelled = error instanceof AuxiliaryLegCancelledError;
      const aborted = error instanceof EmptyError && !firstPeerConnectionError;
      if (!cancelled && !aborted) {
        logger.warn('[WebRTCManager] Error initializing additional peer connection:', error);
      }
      // A cancel destroys and deregisters the leg on its way in; destroying it
      // again re-emits an identical registry update.
      if (rtcPeerConnController && this._rtcPeerConnectionsMap.has(rtcPeerConnController.id)) {
        rtcPeerConnController.destroy();
        // Destroying the controller alone left a dead entry that
        // requestIceRestartAll() and requestKeyframeAll() kept iterating, and
        // that would also wedge the single-share guard above.
        this._rtcPeerConnectionsMap.delete(rtcPeerConnController.id);
        this._rtcPeerConnections$.next(Array.from(this._rtcPeerConnectionsMap.values()));
      }
      if (isScreenShare) {
        // Or a later removeScreenMedia() would verto.bye a destroyed leg.
        this._screenShareId = undefined;
        this._screenShareStatus$.next('none');
      }
      if (cancelled) {
        // Outranks any failure already reported on this leg: onError has had
        // that one, and what the caller asked about is why the start ended.
        logger.debug('[WebRTCManager] Additional peer connection removed before connecting.');
        throw error;
      }
      if (firstPeerConnectionError) {
        // Reject the public API with the raw getUserMedia/getDisplayMedia
        // error so apps can inspect error.name (e.g. 'NotAllowedError').
        throw firstPeerConnectionError instanceof MediaAccessError &&
          firstPeerConnectionError.originalError instanceof Error
          ? firstPeerConnectionError.originalError
          : firstPeerConnectionError;
      }
      if (error instanceof EmptyError) {
        // The wait for 'connected' was aborted with no failure: the call was
        // hung up or the device removed while connecting — a benign cancel.
        logger.debug('[WebRTCManager] Additional peer connection aborted before connecting.');
        return undefined;
      }
      if (error instanceof TimeoutError) {
        // A bare RxJS TimeoutError carries no leg and no cause.
        throw new AuxiliaryLegTimeoutError(propose, error);
      }
      throw error instanceof Error ? error : new Error(String(error), { cause: error });
    }
  }

  public async removeInputDevices(id: string): Promise<void> {
    return this.removeAdditionalPeerConnection(id);
  }

  public removeMainInputDevice(options = { removeAudio: false, removeVideo: true }): void {
    let removeTrack: 'audio' | 'video' | 'both' | undefined = undefined;
    if (options.removeAudio) {
      removeTrack = 'audio';
    }
    if (options.removeVideo) {
      removeTrack = removeTrack === 'audio' ? 'both' : 'video';
    }

    if (removeTrack) {
      return this.mainPeerConnection.stopTrackSender(removeTrack, {
        updateTransceiverDirection: true
      });
    }
  }

  public async removeScreenMedia(): Promise<void> {
    if (!['starting', 'started'].includes(this._screenShareStatus$.value)) {
      // Returning matters while a stop is already in flight: the id outlives
      // the awaited bye, so falling through sends a second bye for one leg.
      logger.warn('[WebRTCManager] No active screen share to stop.');
      return;
    }
    if (!this._screenShareId) {
      logger.debug('[WebRTCManager] No screen share peer connection found.');
      return;
    }
    this._screenShareStatus$.next('stopping');
    await this.removeAdditionalPeerConnection(this._screenShareId);
    this._screenShareId = undefined;
    this._screenShareStatus$.next('none');
  }

  public async removeAdditionalPeerConnection(id: string): Promise<void> {
    const rtcPeerConnController = this._rtcPeerConnectionsMap.get(id);
    try {
      if (rtcPeerConnController) {
        await this.executeVertoBye(rtcPeerConnController);
      }
    } finally {
      // Only a leg that never connected can still have an init waiting on it, so
      // a cancel reported for one that came up would be a lie to this stream.
      // Before the destroy, or that init ends on the bare EmptyError the destroy
      // produces instead. Not via reportLegError(): an app-initiated removal is
      // not a failure and must not reach onError.
      if (rtcPeerConnController && rtcPeerConnController.connectionState !== 'connected') {
        this._legErrors$.next({
          legId: id,
          error: new AuxiliaryLegCancelledError(rtcPeerConnController.propose)
        });
      }
      rtcPeerConnController?.destroy();
      this._rtcPeerConnectionsMap.delete(id);
      this._rtcPeerConnections$.next(Array.from(this._rtcPeerConnectionsMap.values()));
    }
  }

  private async executeVertoBye(
    rtcPeerConnController: RTCPeerConnectionController,
    cause?: VertoByeCause
  ): Promise<void> {
    try {
      const causeParams = cause
        ? {
            cause: cause,
            causeCode: VertoByeCauseCodes[cause]
          }
        : {};

      await this.executeVerto(
        VertoBye({
          ...causeParams,
          dialogParams: this.dialogParams(rtcPeerConnController)
        }),
        // Without this the frame — and any failure of it — is addressed to the
        // main leg, so ending an auxiliary leg the server had already dropped
        // was reported as a fatal main-leg error and destroyed the call.
        {
          callID: rtcPeerConnController.id,
          node_id: rtcPeerConnController.nodeId ?? undefined
        }
      );
    } catch (error) {
      logger.warn(
        '[WebRTCManager] Call might already be disconnected, error sending Verto bye:',
        error
      );
      throw error;
    }
  }
  public async bye(cause?: VertoByeCause): Promise<void> {
    void this.attachManager.detach(this.buildAttachableCall());
    const rtcPeerConnController = this._rtcPeerConnectionsMap.get(this.webRtcCallSession.id);
    if (rtcPeerConnController) {
      await this.executeVertoBye(rtcPeerConnController, cause);
    }
  }

  public async sendDigits(dtmf: string): Promise<void> {
    const vertoInfoMessage = VertoInfo({
      sessid: this.webRtcCallSession.id,
      dialogParams: {
        callID: this.webRtcCallSession.id
      },
      dtmf
    });

    try {
      await this.executeVerto(vertoInfoMessage);
    } catch (error) {
      logger.warn('[WebRTCManager] Error sending DTMF digits:', error);
      throw error;
    }
  }

  public async transfer(options: TransferOptions): Promise<void> {
    const message = VertoModify({
      ...options,
      dialogParams: this.dialogParams(this.mainPeerConnection),
      action: 'transfer'
    });
    try {
      logger.debug('[WebRTCManager] Transferring call with options:', options);
      await this.executeVerto(message);
    } catch (error) {
      logger.error('[WebRTCManager] Error transferring call:', error);
      throw error;
    }
  }

  public destroy(): void {
    this._rtcPeerConnectionsMap.forEach((rtcPeerConnController) => {
      rtcPeerConnController.destroy();
    });
    this._rtcPeerConnectionsMap.clear();
    this._rtcPeerConnections$.complete();
    super.destroy();
  }
}
