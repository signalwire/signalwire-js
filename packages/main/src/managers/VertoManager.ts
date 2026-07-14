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
  timeout
} from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import { RTCPeerConnectionController } from '../controllers/RTCPeerConnectionController';
import { INVITE_VERSION } from '../core/constants';
import {
  DependencyError,
  InvalidParams,
  JSONRPCError,
  MediaAccessError,
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

import type { AttachManager } from './AttachManager';
import type { LocalAudioPipeline } from '../controllers/LocalAudioPipeline';
import type {
  ExecuteVertoOptions,
  ScreenShareStatus,
  SignalingStatus,
  TransferOptions,
  WebRTCVertoManagerOptions
} from './types/verto-manager.types';
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
import type { MediaOptions, MediaDirections } from '../core/types/media.types';
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
  private _screenShareTimeoutMs = 50000;

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

      void (async () => {
        try {
          // For audio: use track replacement because applyConstraints fails on iOS Safari
          if (audio && rtcPeerConnController) {
            await rtcPeerConnController.replaceAudioTrackWithConstraints(audio);
          }
          // For video: use applyConstraints with fallback (from Section 16.2)
          if (video) {
            await rtcPeerConnController?.updateSendersConstraints('video', video);
          }
          // Emit mediaParamsUpdated on the Call
          this.webRtcCallSession.emitMediaParamsUpdated({
            audio,
            video,
            timestamp: Date.now()
          });
        } catch (error) {
          logger.warn('[WebRTCManager] Error applying server-pushed media params:', error);
          this.onError?.(
            error instanceof Error ? error : new Error(String(error), { cause: error })
          );
        }
      })();
    });

    this.subscribeTo(this.vertoPing$, (vertoPing: VertoPingParams) => {
      void this.attachManager.attach(this.buildAttachableCall());
      void this.sendVertoPong(vertoPing);
    });
  }

  /**
   * Set node_id/selfId only when the current value is null.
   *
   * During reattach, `call.joined` and `verto.answer` events can deliver
   * these identifiers before the `verto.invite` RPC response (`CALL CREATED`)
   * arrives. These methods let early events populate them eagerly so that
   * downstream RPC calls (e.g. `call.layout.list`) don't fail with empty
   * identifiers. `processInviteResponse()` remains the authoritative source
   * and always overwrites unconditionally.
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

  public async updateMediaConstraints(
    options: {
      audio?: MediaTrackConstraints;
      video?: MediaTrackConstraints;
    } = {}
  ): Promise<void> {
    const { audio, video } = options;
    try {
      if (audio) {
        await this.mainPeerConnection.updateSendersConstraints('audio', audio);
      }
      if (video) {
        await this.mainPeerConnection.updateSendersConstraints('video', video);
      }
    } catch (error) {
      logger.warn('[WebRTCManager] Error updating media constraints:', error);
      this.onError?.(error instanceof Error ? error : new Error(String(error), { cause: error }));
      throw error;
    }
  }

  public get selfId(): string | null {
    return this._selfId$.value;
  }

  /** Build an AttachableCall from the current call state. */
  private buildAttachableCall(idOverride?: string) {
    return {
      nodeId: this.nodeId ?? undefined,
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

    // Check for error at top level
    if (response.error) {
      const error = new JSONRPCError(
        response.error.code,
        response.error.message,
        response.error.data
      );
      this.onError?.(error);
      return response;
    }

    // Check for nested error in result.result (webrtc.verto wraps the inner response)
    const innerResult = getValueFrom<{ error?: { code: number; message: string; data?: unknown } }>(
      response,
      'result.result'
    );
    if (innerResult?.error) {
      const error = new JSONRPCError(
        innerResult.error.code,
        innerResult.error.message,
        innerResult.error.data
      );
      this.onError?.(error);
      return response;
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
      // execute() can reject before executeVerto checks the response.
      // Route the error through onError so it reaches Call.emitError.
      logger.error(`[WebRTCManager] Error sending Verto ${vertoMethod}:`, error);
      this.onError?.(error instanceof Error ? error : new Error(String(error), { cause: error }));
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
          this.onError?.(modifyError);
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
      this.onError?.(signalingError);
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
    if (
      !response.error &&
      getValueFrom(response, 'result.result.result.message') === 'CALL CREATED'
    ) {
      this.emitMainSignalingStatus(rtcPeerConnController.id, 'trying');
      this._nodeId$.next(getValueFrom<string>(response, 'result.node_id') ?? null);
      const memberId = getValueFrom<string>(response, 'result.result.result.memberID') ?? null;
      const callId = getValueFrom<string>(response, 'result.result.result.callID') ?? null;
      logger.debug('[WebRTCManager] Verto invite response:', { callId, memberId, response });

      this._selfId$.next(memberId);
      rtcPeerConnController.setMemberId(memberId);
      if (callId) {
        this.webRtcCallSession.addCallId(callId);
        void this.attachManager.attach(this.buildAttachableCall(callId));
      } else {
        logger.warn('[WebRTCManager] Cannot attach call, missing callId:', {
          nodeId: this.nodeId,
          callId
        });
      }
      logger.info('[WebRTCManager] Verto invite successful');
      logger.debug(
        `[WebRTCManager] nodeid: ${this._nodeId$.value}, selfId: ${this._selfId$.value}`
      );
    } else {
      logger.error('[WebRTCManager] Verto invite failed:', response);
      const inviteError = response.error
        ? new JSONRPCError(response.error.code, response.error.message, response.error.data)
        : new Error('Verto invite failed: unexpected response');
      this.onError?.(inviteError);
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
      this.onError?.(error);
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
        this.onError?.(error instanceof Error ? error : new Error(String(error), { cause: error }));
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
        currentNodeId: this._nodeId$.value
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
        this.onError?.(error instanceof Error ? error : new Error(String(error), { cause: error }));
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
      this.onError?.(error);
      throw error;
    }
  }

  public async addScreenMedia(options: MediaOptions = { audio: false }): Promise<void> {
    await this.initAdditionalPeerConnection('screenshare', options);
  }

  private async initAdditionalPeerConnection(
    propose: RTCPeerConnectionPropose,
    options: MediaOptions
  ): Promise<string | undefined> {
    const isScreenShare = propose === 'screenshare';
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
        this.onError?.(error, { fatal: false });
      });
      await firstValueFrom(
        rtcPeerConnController.connectionState$.pipe(
          filter((state) => state === 'connected'),
          take(1),
          timeout(this._screenShareTimeoutMs),
          takeUntil(this.destroyed$)
        )
      );
      if (isScreenShare) {
        this._screenShareStatus$.next('started');
      }
      logger.info(`[WebRTCManager] Additional peer connection connected (${propose}).`);
      return rtcPeerConnController.id;
    } catch (error) {
      logger.warn('[WebRTCManager] Error initializing additional peer connection:', error);
      if (rtcPeerConnController) {
        rtcPeerConnController.destroy();
      }
      if (isScreenShare) {
        this._screenShareStatus$.next('none');
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
      logger.warn('[WebRTCManager] No active screen share to stop.');
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
        })
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
