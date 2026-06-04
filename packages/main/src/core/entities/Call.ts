import {
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  merge,
  of,
  share,
  skip,
  takeUntil,
  tap
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Destroyable } from '../../behaviors/Destroyable';
import { PreferencesContainer } from '../../containers/PreferencesContainer';
import { RemoteAudioMeter } from '../../controllers/RemoteAudioMeter';
import { RTCStatsMonitor } from '../../controllers/RTCStatsMonitor';
import { CallRecoveryManager } from '../../managers/CallRecoveryManager';
import { ParticipantFactory } from '../../managers/ParticipantFactory';
import { filterAs } from '../../operators';
import { getValueFrom } from '../../utils/getValueFrom';
import { getLogger } from '../../utils/logger';
import { computeMOS, mosToQualityLevel } from '../../utils/qualityScore';
import { PEER_CONNECTION_RECOVERY_POLL_MS, PEER_CONNECTION_RECOVERY_WAIT_MS } from '../constants';
import { InvalidParams, JSONRPCError, UnimplementedError } from '../errors';
import { buildRPCRequest, VertoSubscribe, WebrtcVerto } from '../RPCMessages';
import { isJSONRPCErrorResponse } from '../RPCMessages/guards/base.guards';
import {
  isCallStateMetadata,
  isCallUpdatedMetadata,
  isLayoutChangedMetadata,
  isMemberJoinedMetadata,
  isMemberLeftMetadata,
  isMemberTalkingMetadata,
  isMemberUpdatedMetadata,
  isSignalwireCallMetadata,
  isWebrtcMessageMetadata
} from '../RPCMessages/guards/events.guards';

import type { Address } from './Address';
import type { Participant, SelfParticipant } from './Participant';
import type {
  CallStatus,
  CallOptions,
  CallManager,
  CallParticipant,
  CallSelfParticipant
} from './types/call.types';
import type { NetworkChangeEvent } from '../../controllers/NetworkMonitor';
import type {
  NetworkIssue as StatsNetworkIssue,
  NetworkMetrics as StatsNetworkMetrics
} from '../../controllers/RTCStatsMonitor';
import type { ClientSession } from '../../interfaces/ClientSession';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { WebRTCVerto } from '../../interfaces/WebRTCVerto';
import type { CallEventsManager } from '../../managers/CallEventsManager';
import type {
  RecoveryState,
  RecoveryEvent,
  RecoveryCallbacks
} from '../../managers/CallRecoveryManager';
import type { TransferOptions } from '../../managers/types/verto-manager.types';
import type { QualityLevel } from '../../utils/qualityScore';
import type { CallError } from '../errors';
import type { JSONRPCParams } from '../RPCMessages';
import type { JSONRPCRequest, JSONRPCResponse } from '../RPCMessages/types/base';
import type { LayoutLayer, MemberTarget } from '../RPCMessages/types/common';
import type {
  CallStatePayload,
  CallUpdatedPayload,
  LayoutChangedPayload,
  MemberJoinedPayload,
  MemberLeftPayload,
  MemberTalkingPayload,
  MemberUpdatedPayload
} from '../RPCMessages/types/events';
import type { Capability, CallDirection, VideoPosition } from '../types/call.types';
import type { MediaOptions, MediaDirections } from '../types/media.types';
import type { MediaParamsEvent } from '../types/resilience.types';
import type { PendingRPCOptions } from '../utils';
import type { Observable, BehaviorSubject } from 'rxjs';

const logger = getLogger();

/**
 * Ratio between the critical and warning RTT spike multipliers.
 * Warning threshold = baseline * warningMultiplier (default 3x)
 * Critical threshold = baseline * warningMultiplier * RTT_CRITICAL_TO_WARNING_RATIO
 * With default 3x warning: critical = 3 * 5/3 = 5x baseline.
 */
const RTT_CRITICAL_TO_WARNING_RATIO = 5 / 3;

/**
 * Manager instances returned by initialization callback
 */
export interface CallManagers {
  vertoManager: WebRTCVerto;
  callEventsManager: CallEventsManager;
}

/**
 * Initialization callback that creates managers for a Call instance
 * @param call - The WebRTCCall instance being initialized
 * @returns Manager instances for the call
 */
export type ManagerInitializer = (call: WebRTCCall) => CallManagers;

/**
 * Required initialization configuration for Call constructor.
 * Calls must be created via {@link CallFactory} which provides these dependencies.
 */
export interface CallInitialization {
  /**
   * Callback function that creates and wires manager instances
   */
  initializeManagers: ManagerInitializer;
  /**
   * Device controller for media device access
   */
  deviceController: DeviceController;
  /**
   * Network change events for feeding recovery pipeline
   */
  networkChange$?: Observable<NetworkChangeEvent>;
}

const fromDestinationParams = (destination?: string): Record<string, unknown> => {
  if (!destination) return {};
  try {
    const url = new URL(`destination:${destination}`);
    const params: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch (error) {
    logger.warn(`Failed to parse destination URI: ${destination}`, error);
    return {};
  }
};

/**
 * Concrete WebRTC call implementation.
 *
 * Manages the full lifecycle of a call including signaling, media streams,
 * participants, layout, and event routing. Created via {@link SignalWire.dial}
 * or received as an inbound call.
 */
export class WebRTCCall extends Destroyable implements CallManager {
  /** Unique identifier for this call. */
  public readonly id: string;
  /** Destination URI this call was placed to. */
  public to?: string;
  private vertoManager!: WebRTCVerto;
  private callEventsManager!: CallEventsManager;
  private participantFactory: ParticipantFactory;
  private _errors$ = this.createReplaySubject<CallError>(1);
  private _status$: BehaviorSubject<CallStatus>;
  private _lastMergedStatus: CallStatus = 'new';
  private _answered$ = this.createReplaySubject<boolean>();
  private _answerMediaOptions?: MediaOptions;
  private _holdState = false;
  private _userVariables$ = this.createBehaviorSubject<Record<string, unknown>>({
    ...PreferencesContainer.instance.userVariables
  });

  // Resilience subsystems (created lazily on 'connected')
  private _statsMonitor?: RTCStatsMonitor;
  private _recoveryManager?: CallRecoveryManager;
  private _networkChange$?: Observable<NetworkChangeEvent>;

  // Resilience subjects — created eagerly so subscribers can attach before 'connected'.
  // Fed by stats monitor and recovery manager once they're initialized.
  private _networkIssues$ = this.createBehaviorSubject<StatsNetworkIssue[]>([]);
  private _networkMetrics$ = this.createBehaviorSubject<StatsNetworkMetrics[]>([]);
  private _isNetworkHealthy$ = this.createBehaviorSubject<boolean>(true);
  private _qualityScore$ = this.createBehaviorSubject<number>(5.0);
  private _qualityLevel$ = this.createBehaviorSubject<QualityLevel>('excellent');
  private _recoveryState$ = this.createBehaviorSubject<RecoveryState>('idle');
  private _recoveryEvent$ = this.createSubject<RecoveryEvent>();
  private _bandwidthConstrained$ = this.createBehaviorSubject<boolean>(false);
  private _mediaParamsUpdated$ = this.createSubject<MediaParamsEvent>();

  // ===========================================================================
  private _customSubscriptions = new Map<string, Observable<Record<string, unknown>>>();
  private _pushToTalkEnabled = false;
  private _remoteAudioMeter: RemoteAudioMeter | null = null;
  constructor(
    public clientSession: ClientSession,
    public options: CallOptions,
    initialization: CallInitialization,
    public address?: Address
  ) {
    super();
    this.id = options.callId ?? uuid();
    this.to = options.to;
    this._userVariables$.next({
      ...this._userVariables$.value,
      ...fromDestinationParams(options.to),
      ...options.userVariables
    });

    this.subscribeTo(this.webrtcMessages$, (message) => {
      const userVars = getValueFrom<Record<string, unknown>>(message, 'params.userVariables');
      if (userVars) {
        this._userVariables$.next({
          ...this._userVariables$.value,
          ...userVars
        });
      }
    });

    const managers = initialization.initializeManagers(this);
    this.vertoManager = managers.vertoManager;
    this.callEventsManager = managers.callEventsManager;

    if (options.initOffer) {
      this._status$ = this.createBehaviorSubject<CallStatus>('ringing');
      this._lastMergedStatus = 'ringing';
    } else {
      this._status$ = this.createBehaviorSubject<CallStatus>('new');
    }

    const { deviceController, networkChange$ } = initialization;
    this._networkChange$ = networkChange$;

    // Create participant factory with bound executeMethod
    this.participantFactory = new ParticipantFactory(
      this.executeMethod.bind(this),
      this.vertoManager,
      deviceController
    );

    // Wire resilience lifecycle to call status.
    // IMPORTANT: Use the raw internal merge (not the public status$ getter)
    // because publicCachedObservable defers emissions via asapScheduler,
    // which can cause us to miss the 'connected' transition.
    this.subscribeTo(
      merge(this._status$.asObservable(), this.vertoManager.signalingStatus$).pipe(
        distinctUntilChanged(),
        takeUntil(this._destroyed$)
      ),
      (status) => {
        // Keep _lastMergedStatus in sync so recovery callbacks (isCallConnected)
        // work even if nobody subscribes to the public status$ getter.
        this._lastMergedStatus = status;

        if (status === 'connected' && !this._statsMonitor) {
          this.initResilienceSubsystems();
        } else if (status === 'disconnected') {
          // Stop stats polling (no useful metrics during disconnect) but keep
          // the recovery manager alive — it's needed to restore the call.
          this._statsMonitor?.destroy();
          this._statsMonitor = undefined;
        } else if (status === 'destroyed' || status === 'failed') {
          this.stopResilienceSubsystems();
        }
      }
    );
  }

  /** Observable stream of errors from media, signaling, and peer connection layers. */
  public get errors$(): Observable<CallError> {
    return this.deferEmission(this._errors$.asObservable());
  }

  /**
   * @internal Push an error to the call's error stream.
   * Fatal errors automatically transition the call to `'failed'` and destroy it.
   */
  public emitError(callError: CallError): void {
    if (this._status$.value === 'destroyed' || this._status$.value === 'failed') return;
    this._errors$.next(callError);
    if (callError.fatal) {
      this._status$.next('failed');
      this.destroy();
    }
  }

  /** Notify the recovery manager that a verto.modify signaling exchange failed. */
  public notifyModifyFailed(): void {
    this._recoveryManager?.notifyModifyFailed();
  }

  /** Whether this call is `'inbound'` or `'outbound'`. */
  public get direction(): CallDirection {
    return this.options.initOffer ? 'inbound' : 'outbound';
  }

  /** Observable of the address associated with this call. */
  public get address$(): Observable<Address | undefined> {
    return this.deferEmission(from([this.address])).pipe(takeUntil(this._destroyed$));
  }

  /** Display name of the caller. */
  public get fromName(): string | undefined {
    return this.options.fromName;
  }

  /** Address URI of the caller. */
  public get from(): string | undefined {
    return this.options.from;
  }

  /** Display name of the callee. */
  public get toName(): string | undefined {
    return this.options.toName;
  }

  /** Toggles whether incoming video is received. @throws {UnimplementedError} Not yet implemented. */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async toggleIncomingVideo(): Promise<void> {
    throw new UnimplementedError();
  }

  /** Toggles whether incoming audio is received. @throws {UnimplementedError} Not yet implemented. */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async toggleIncomingAudio(): Promise<void> {
    throw new UnimplementedError();
  }

  /** @internal Registers an additional call ID for event routing. */
  public addCallId(callId: string): void {
    this.callEventsManager.addCallId(callId);
  }

  /** List of capabilities available in the current call. */
  public get capabilities(): Capability[] {
    return this.callEventsManager.capabilities;
  }

  /** Current snapshot of all participants in the call. */
  public get participants(): CallParticipant[] {
    return this.callEventsManager.participants;
  }

  /** The local participant, or `null` if not yet joined. */
  public get self(): CallSelfParticipant | null {
    return this.callEventsManager.self;
  }

  /** Toggles the call lock state, preventing or allowing new participants from joining. */
  async toggleLock(): Promise<void> {
    const method = this.locked ? 'call.unlock' : 'call.lock';
    await this.executeMethod(this.selfId ?? '', method, {});
  }

  /**
   * Toggles the hold state of the call (pauses/resumes local media transmission).
   *
   * Distinct from {@link Participant.toggleMute} which mutes individual tracks.
   */
  async toggleHold(): Promise<void> {
    if (this._holdState) {
      await this.vertoManager.unhold();
    } else {
      await this.vertoManager.hold();
    }
    this._holdState = !this._holdState;
  }

  /** @throws {UnimplementedError} Not yet implemented. Status tracked via {@link recording$}. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async startRecording(): Promise<void> {
    // NEEDS check backend API status
    throw new UnimplementedError();
  }

  /** @throws {UnimplementedError} Not yet implemented. Status tracked via {@link streaming$}. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async startStreaming(): Promise<void> {
    // V3 VIDEO
    // NEEDS check backend API status
    throw new UnimplementedError();
  }

  /**
   * Replaces the call's custom metadata.
   * @param _meta - Metadata object to set.
   * @throws {UnimplementedError} Not yet implemented.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async setMeta(_meta: Record<string, unknown>): Promise<void> {
    // NEEDS backend implementation
    throw new UnimplementedError();
  }
  /**
   * Merges values into the call's custom metadata (unlike {@link setMeta} which replaces).
   * @param _meta - Metadata to merge.
   * @throws {UnimplementedError} Not yet implemented.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async updateMeta(_meta: Record<string, unknown>): Promise<void> {
    // NEEDS backend implementation
    throw new UnimplementedError();
  }

  /** Observable of layout layer positions for all participants. */
  public get layoutLayers$(): Observable<LayoutLayer[]> {
    return this.deferEmission(this.callEventsManager.layoutLayers$).pipe(
      takeUntil(this._destroyed$)
    );
  }

  /** Current snapshot of layout layers. */
  public get layoutLayers(): LayoutLayer[] {
    return this.callEventsManager.layoutLayers;
  }

  /**
   * Executes a Verto RPC method targeting a specific participant.
   *
   * Constructs call context (node_id, call_id, member_id) and sends the RPC request.
   *
   * @param target - Target member ID string, or a {@link MemberTarget} object.
   * @param method - Verto method name (e.g. `'call.mute'`, `'call.member.remove'`).
   * @param args - Parameters for the RPC method.
   * @returns The RPC response.
   * @throws {JSONRPCError} If the RPC call returns an error.
   */
  public async executeMethod<T extends JSONRPCResponse = JSONRPCResponse>(
    target: string | MemberTarget,
    method: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const params = this.buildMethodParams(target, args);

    const request = buildRPCRequest({
      method,
      params
    });

    try {
      const response: T = await this.clientSession.execute(request);
      if (isJSONRPCErrorResponse(response)) {
        throw new JSONRPCError(
          parseInt(response.result?.code ?? '0'),
          `Error response from method ${method}: ${response.result?.code} ${response.result?.message}`,
          undefined,
          undefined,
          request.id
        );
      }
      return response;
    } catch (error) {
      logger.error(`[Call] Error executing method ${method} with params`, params, error);
      throw error;
    }
  }

  private buildMethodParams(
    target: string | MemberTarget,
    args: Record<string, unknown>
  ): JSONRPCParams {
    const self: MemberTarget = {
      node_id: this.nodeId ?? '',
      call_id: this.id,
      member_id: this.vertoManager.selfId ?? ''
    };

    if (typeof target === 'object') {
      // Full MemberTarget provided — use targets array with the member's actual call_id
      return { ...args, self, targets: [target] };
    }

    // String member_id provided — use target singular with the call's node/call reference
    return {
      ...args,
      self,
      target: { node_id: this.nodeId ?? '', call_id: this.id, member_id: target }
    };
  }

  /** Observable of the current call status (e.g. `'ringing'`, `'connected'`). */
  public get status$(): Observable<CallStatus> {
    return this.publicCachedObservable('status$', () =>
      merge(this._status$.asObservable(), this.vertoManager.signalingStatus$).pipe(
        distinctUntilChanged(),
        tap((status) => {
          this._lastMergedStatus = status;
        })
      )
    );
  }
  /** Observable of the participants list, emits on join/leave/update. */
  public get participants$(): Observable<CallParticipant[]> {
    return this.deferEmission(this.callEventsManager.participants$).pipe(
      takeUntil(this._destroyed$)
    );
  }
  /** Observable of the local (self) participant. */
  public get self$(): Observable<CallSelfParticipant> {
    return this.deferEmission(this.callEventsManager.self$).pipe(takeUntil(this._destroyed$));
  }
  /** Observable indicating whether the call is being recorded. */
  public get recording$(): Observable<boolean> {
    return this.deferEmission(this.callEventsManager.recording$).pipe(takeUntil(this._destroyed$));
  }

  /** Observable indicating whether the call is being streamed. */
  public get streaming$(): Observable<boolean> {
    return this.deferEmission(this.callEventsManager.streaming$).pipe(takeUntil(this._destroyed$));
  }

  /** Observable indicating whether raise-hand priority is active. */
  public get raiseHandPriority$(): Observable<boolean> {
    return this.deferEmission(this.callEventsManager.raiseHandPriority$).pipe(
      takeUntil(this._destroyed$)
    );
  }

  /** Observable indicating whether the call room is locked. */
  public get locked$(): Observable<boolean> {
    return this.deferEmission(this.callEventsManager.locked$).pipe(takeUntil(this._destroyed$));
  }

  /** Observable of custom metadata associated with the call. */
  public get meta$(): Observable<Record<string, unknown>> {
    return this.deferEmission(this.callEventsManager.meta$).pipe(takeUntil(this._destroyed$));
  }

  /** Observable of the call's capability flags. */
  public get capabilities$(): Observable<Capability[]> {
    return this.deferEmission(this.callEventsManager.capabilities$).pipe(
      takeUntil(this._destroyed$)
    );
  }

  /** Observable of the current layout name. */
  public get layout$(): Observable<string> {
    return this.deferEmission(this.callEventsManager.layout$).pipe(takeUntil(this._destroyed$));
  }

  /** Current call status. */
  public get status(): CallStatus {
    return this._lastMergedStatus;
  }

  /** Whether the call is currently being recorded. */
  public get recording(): boolean {
    return this.callEventsManager.recording;
  }

  /** Whether the call is currently being streamed. */
  public get streaming(): boolean {
    return this.callEventsManager.streaming;
  }

  /** Whether raise-hand priority is active. */
  public get raiseHandPriority(): boolean {
    return this.callEventsManager.raiseHandPriority;
  }

  /** Whether the call room is locked. */
  public get locked(): boolean {
    return this.callEventsManager.locked;
  }

  /** Current custom metadata of the call. */
  public get meta(): Record<string, unknown> {
    return this.callEventsManager.meta;
  }

  /** Current layout name, or `undefined` if not set. */
  public get layout(): string | undefined {
    return this.callEventsManager.layout;
  }

  /** Observable of available layout names. */
  public get layouts$(): Observable<string[]> {
    return this.deferEmission(this.callEventsManager.layouts$).pipe(takeUntil(this._destroyed$));
  }

  /** Current snapshot of available layout names. */
  public get layouts(): string[] {
    return this.callEventsManager.layouts;
  }

  /** Observable of the local media stream (camera/microphone). */
  public get localStream$(): Observable<MediaStream> {
    return this.deferEmission(this.vertoManager.localStream$).pipe(takeUntil(this._destroyed$));
  }
  /** Current local media stream, or `null` if not available. */
  public get localStream(): MediaStream | null {
    return this.vertoManager.localStream;
  }
  /** Observable of the remote media stream from the far end. */
  public get remoteStream$(): Observable<MediaStream> {
    return this.deferEmission(this.vertoManager.remoteStream$).pipe(takeUntil(this._destroyed$));
  }
  /** Current remote media stream, or `null` if not available. */
  public get remoteStream(): MediaStream | null {
    return this.vertoManager.remoteStream;
  }

  /** Observable of custom user variables associated with the call. */
  public get userVariables$(): Observable<Record<string, unknown>> {
    return this.deferEmission(this._userVariables$.asObservable());
  }

  /** a copy of the current custom user variables of the call. */
  public get userVariables(): Record<string, unknown> {
    return { ...this._userVariables$.value };
  }

  /** Merge current custom user variables of the call. */
  public set userVariables(variables: Record<string, unknown>) {
    this._userVariables$.next({ ...this._userVariables$.value, ...variables });
  }

  // ===========================================================================
  // Resilience observables & methods
  //
  // These use eagerly-created BehaviorSubjects (not publicCachedObservable)
  // so subscribers can attach before 'connected' and still receive updates
  // once the stats monitor and recovery manager are initialized.
  // ===========================================================================

  /** Observable of current network health issues (empty array = healthy). */
  public get networkIssues$(): Observable<StatsNetworkIssue[]> {
    return this.deferEmission(this._networkIssues$.asObservable());
  }

  /** Current snapshot of network issues. */
  public get networkIssues(): StatsNetworkIssue[] {
    return this._networkIssues$.value;
  }

  /** Simple boolean health indicator derived from stats monitor. */
  public get isNetworkHealthy$(): Observable<boolean> {
    return this.deferEmission(this._isNetworkHealthy$.asObservable());
  }

  /** Whether the network is currently healthy. */
  public get isNetworkHealthy(): boolean {
    return this._isNetworkHealthy$.value;
  }

  /** Rolling history of raw network metrics (RTT, jitter, packet loss, bitrate). */
  public get networkMetrics$(): Observable<StatsNetworkMetrics[]> {
    return this.deferEmission(this._networkMetrics$.asObservable());
  }

  /** Current snapshot of the metrics rolling window. */
  public get networkMetrics(): StatsNetworkMetrics[] {
    return this._networkMetrics$.value;
  }

  /** Observable of MOS quality score (1-5) computed from stats metrics. */
  public get qualityScore$(): Observable<number> {
    return this.deferEmission(this._qualityScore$.asObservable());
  }

  /** Observable of simplified quality level (excellent/good/fair/poor/critical). */
  public get qualityLevel$(): Observable<QualityLevel> {
    return this.deferEmission(this._qualityLevel$.asObservable());
  }

  /** Observable of the recovery pipeline state machine. */
  public get recoveryState$(): Observable<RecoveryState> {
    return this.deferEmission(this._recoveryState$.asObservable());
  }

  /** Observable of recovery events (keyframe requested, ICE restart, etc.). */
  public get recoveryEvent$(): Observable<RecoveryEvent> {
    return this.deferEmission(this._recoveryEvent$.asObservable());
  }

  /** Observable indicating whether the call is bandwidth-constrained. */
  public get bandwidthConstrained$(): Observable<boolean> {
    return this.deferEmission(this._bandwidthConstrained$.asObservable());
  }

  /** Observable that emits when server-pushed media params are applied. */
  public get mediaParamsUpdated$(): Observable<MediaParamsEvent> {
    return this.deferEmission(this._mediaParamsUpdated$.asObservable());
  }

  /**
   * @internal Emit a media params update event.
   * Called by the VertoManager when server-pushed media params are applied.
   */
  public emitMediaParamsUpdated(event: MediaParamsEvent): void {
    this._mediaParamsUpdated$.next(event);
  }

  /** Request a video keyframe via RTCP PLI/FIR. */
  public requestKeyframe(): void {
    this.vertoManager.requestKeyframe?.();
  }

  /** Force an ICE restart / re-INVITE. */
  public async requestIceRestart(): Promise<void> {
    await this.vertoManager.requestIceRestart?.();
  }

  /**
   * @internal Initialize resilience subsystems when the call reaches 'connected'.
   * Called from within the status subscription to wire stats and recovery.
   */
  private initResilienceSubsystems(): void {
    const pc = this.rtcPeerConnection;
    logger.debug(
      `[Call] initResilienceSubsystems: pc=${pc ? 'exists' : 'undefined'}, connectionState=${pc?.connectionState}`
    );
    if (!pc) {
      logger.warn('[Call] No peer connection available, skipping resilience init');
      return;
    }

    try {
      const prefs = PreferencesContainer.instance;

      // Create stats monitor
      this._statsMonitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: prefs.statsPollingInterval,
        baselineSamples: prefs.statsBaselineSamples,
        noAudioPacketThresholdMs: prefs.statsNoPacketThreshold,
        rttSpikeWarningMultiplier: prefs.statsRttSpikeMultiplier,
        rttSpikeCriticalMultiplier: prefs.statsRttSpikeMultiplier * RTT_CRITICAL_TO_WARNING_RATIO,
        packetLossWarningPercent: prefs.statsPacketLossThreshold * 100,
        packetLossCriticalPercent: prefs.statsPacketLossThreshold * 200,
        jitterSpikeMultiplier: prefs.statsJitterSpikeMultiplier,
        historyWindowSeconds: prefs.statsHistorySize
      });

      // Create recovery manager with callbacks
      const callbacks: RecoveryCallbacks = {
        requestKeyframe: () => {
          try {
            // Use multi-leg keyframe when available (skips send-only screen share legs)
            if (this.vertoManager.requestKeyframeAll) {
              this.vertoManager.requestKeyframeAll();
            } else {
              this.vertoManager.requestKeyframe?.();
            }
          } catch {
            // Non-fatal: keyframe request is best-effort
          }
        },
        requestIceRestart: async (relayOnly?: boolean) => {
          try {
            if (this.vertoManager.requestIceRestartAll) {
              await this.vertoManager.requestIceRestartAll(relayOnly);
            } else {
              await this.vertoManager.requestIceRestart?.(relayOnly);
            }
          } catch {
            return false;
          }
          // The verto.modify came back without throwing — but that only confirms
          // the offer was sent, not that connectivity was actually restored.
          // Wait for the peer connection to reach 'connected' before reporting
          // success; otherwise the recovery manager would reset its attempt
          // count on a partial recovery and skip escalating to the next tier.
          return this.waitForPeerConnectionConnected();
        },
        disableVideo: () => {
          try {
            this.vertoManager.muteMainVideoInputDevice();
            logger.debug('[Call] Recovery manager disabled video');
          } catch {
            logger.debug('[Call] Recovery manager failed to disable video');
          }
        },
        enableVideo: () => {
          this.vertoManager.unmuteMainVideoInputDevice().catch(() => {
            logger.debug('[Call] Recovery manager failed to enable video');
          });
        },
        isNegotiating: () => this.vertoManager.mainPeerConnection.isNegotiating,
        isCallConnected: () => this._lastMergedStatus === 'connected',
        getPeerConnectionState: () => pc.connectionState
      };

      const inputs = {
        signalingReady$: this.clientSession.authenticated$
      };

      this._recoveryManager = new CallRecoveryManager(callbacks, inputs, {
        debounceTimeMs: prefs.recoveryDebounceTime,
        cooldownMs: prefs.recoveryCooldown,
        iceGracePeriodMs: prefs.iceDisconnectedGracePeriod,
        iceRestartTimeoutMs: prefs.iceRestartTimeout,
        maxAttempts: prefs.maxRecoveryAttempts,
        enableRelayFallback: prefs.enableRelayFallback,
        keyframeMaxBurst: prefs.keyframeMaxBurst,
        keyframeBurstWindowMs: prefs.keyframeBurstWindow,
        keyframeCooldownMs: prefs.keyframeCooldown
      });

      // Wire stats monitor → internal subjects so subscribers get live data
      this.subscribeTo(this._statsMonitor.networkIssues$, (issues) => {
        this._networkIssues$.next(issues);
        this._recoveryManager?.reportNetworkIssues(issues);
      });
      this.subscribeTo(this._statsMonitor.isNetworkHealthy$, (healthy) => {
        this._isNetworkHealthy$.next(healthy);
      });
      this.subscribeTo(this._statsMonitor.networkMetrics$, (metrics) => {
        this._networkMetrics$.next(metrics);

        // Compute MOS from latest metrics
        if (metrics.length > 0) {
          const latest = metrics[metrics.length - 1];
          const totalRecv = latest.audio.packetsReceived + latest.video.packetsReceived;
          const totalLost = latest.audio.packetsLost + latest.video.packetsLost;
          const lossPct =
            totalRecv + totalLost > 0 ? (totalLost / (totalRecv + totalLost)) * 100 : 0;
          const mos = computeMOS(latest.roundTripTime, latest.audio.jitter, lossPct);
          this._qualityScore$.next(mos);
          this._qualityLevel$.next(mosToQualityLevel(mos));

          // Feed bandwidth to recovery manager
          if (latest.availableOutgoingBitrate !== undefined) {
            this._recoveryManager?.reportBandwidth(latest.availableOutgoingBitrate / 1000);
          }
        }
      });

      // Wire stats critical issues into recovery triggers
      this.subscribeTo(this._statsMonitor.criticalIssue$, (issue) => {
        this._recoveryManager?.pushTrigger({
          source: 'stats',
          detail: `${issue.type}: ${issue.severity}`,
          issueType: issue.type
        });
      });

      // Wire recovery manager → internal subjects
      this.subscribeTo(this._recoveryManager.recoveryState$, (state) => {
        this._recoveryState$.next(state);
      });
      this.subscribeTo(this._recoveryManager.recoveryEvent$, (event) => {
        this._recoveryEvent$.next(event);
        if (event.action === 'max_attempts_reached') {
          logger.warn('[Call] All recovery attempts exhausted, terminating call');
          this.emitError({
            kind: 'network',
            fatal: true,
            error: new Error('Call recovery failed: all attempts exhausted'),
            callId: this.id
          });
        }
      });
      this.subscribeTo(this._recoveryManager.bandwidthConstrained$, (constrained) => {
        this._bandwidthConstrained$.next(constrained);
      });

      // Feed browser network events (online/offline/connection_change) into recovery
      if (this._networkChange$) {
        this.subscribeTo(this._networkChange$, (event) => {
          if (event.type === 'offline') {
            this._recoveryManager?.pushTrigger({
              source: 'network',
              detail: 'browser went offline'
            });
          } else if (event.type === 'online') {
            this._recoveryManager?.handleWebSocketReconnect();
          }
          // connection_change (e.g. wifi→cellular) is informational, logged by NetworkMonitor
        });
      }

      // Detect WebSocket reconnections: authenticated$ emits true again after
      // the initial connect. Signal the recovery manager so it can distinguish
      // signaling loss (reset counters) from peer connection loss (ICE restart).
      this.subscribeTo(this.clientSession.authenticated$.pipe(skip(1), filter(Boolean)), () => {
        logger.debug('[Call] WebSocket reconnected — notifying recovery manager');
        this._recoveryManager?.handleWebSocketReconnect();
      });

      // Start monitoring
      this._statsMonitor.start();
      logger.debug('[Call] Resilience subsystems initialized for call', this.id);
    } catch (error) {
      // Non-fatal: call should still work without resilience features
      logger.warn('[Call] Failed to initialize resilience subsystems:', error);
    }
  }

  /**
   * Wait for the underlying RTCPeerConnection to reach 'connected' after
   * triggering an ICE restart. Resolves true on success, false on failure
   * or if the state doesn't transition within the configured timeout.
   *
   * Polls connectionState directly because the recovery manager already
   * wraps this call in its own withTimeout(); a separate listener-based
   * implementation would race the outer timeout in subtle ways.
   */
  private async waitForPeerConnectionConnected(): Promise<boolean> {
    const pc = this.rtcPeerConnection;
    if (!pc) return false;

    const deadline = Date.now() + PEER_CONNECTION_RECOVERY_WAIT_MS;
    for (;;) {
      const state: RTCPeerConnectionState = pc.connectionState;
      if (state === 'connected') return true;
      if (state === 'failed' || state === 'closed') return false;
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, PEER_CONNECTION_RECOVERY_POLL_MS));
    }
  }

  /**
   * @internal Stop and destroy resilience subsystems (on disconnect/destroy).
   * Clears references so they can be re-created on reconnect.
   */
  private stopResilienceSubsystems(): void {
    try {
      this._statsMonitor?.destroy();
      this._recoveryManager?.destroy();
    } catch {
      // Non-fatal
    }
    this._statsMonitor = undefined;
    this._recoveryManager = undefined;
  }

  /** @internal */
  public createParticipant(
    memberId: string,
    selfId?: string | null
  ): Participant | SelfParticipant {
    // Use provided selfId (from call.joined event) or fall back to vertoManager.selfId
    const effectiveSelfId = selfId ?? this.vertoManager.selfId;
    if (memberId === effectiveSelfId) {
      return this.participantFactory.createSelfParticipant(memberId);
    }
    return this.participantFactory.createParticipant(memberId);
  }

  /** Observable of the current audio/video send/receive directions. */
  public get mediaDirections$(): Observable<MediaDirections> {
    return this.deferEmission(this.vertoManager.mediaDirections$).pipe(takeUntil(this._destroyed$));
  }

  /** Current audio/video send/receive directions. */
  public get mediaDirections(): MediaDirections {
    return this.vertoManager.mediaDirections;
  }

  protected get participantsId$(): Observable<string[]> {
    return this.cachedObservable('participantsId$', () =>
      this.participants$.pipe(
        map((participants) => participants.map((participant) => participant.id))
      )
    );
  }

  /**
   * Executes a raw JSON-RPC request on the client session.
   *
   * Lower-level than {@link executeMethod} — allows full control over the RPC request structure.
   *
   * @param request - Complete JSON-RPC request object.
   * @param options - Optional RPC execution options (timeout, etc.).
   * @returns The RPC response.
   * @throws {JSONRPCError} If the RPC call returns an error response.
   */
  public async execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T> {
    return this.clientSession.execute(request, options);
  }

  /** Observable of the local participant's member ID. */
  public get selfId$(): Observable<string | null> {
    return this.vertoManager.selfId$;
  }

  /** Local participant's member ID, or `null` if not joined. */
  public get selfId(): string | null {
    return this.vertoManager.selfId;
  }

  /** Observable of the server node ID handling this call. */
  public get nodeId$(): Observable<string | null> {
    return this.vertoManager.nodeId$;
  }

  /** Server node ID handling this call, or `null`. */
  public get nodeId(): string | null {
    return this.vertoManager.nodeId;
  }

  private isCallSessionEvent(event: unknown): event is Event {
    try {
      logger.debug('[Call] Checking if event is for this call session:', event);
      const callId =
        getValueFrom<string>(event, 'params.params.callID') ??
        getValueFrom<string>(event, 'params.call_id');
      const roomSessionId = getValueFrom<string>(event, 'params.room_session_id');
      logger.debug(
        `[Call] Extracted session identifiers callID: ${callId} and roomSessionID: ${roomSessionId} from event:`
      );
      return (
        callId === this.id ||
        (!!callId && this.callEventsManager.isCallIdValid(callId)) ||
        (!!roomSessionId && this.callEventsManager.isRoomSessionIdValid(roomSessionId))
      );
    } catch (error) {
      logger.error('[Call] Error checking if event is for this call session:', error);
      return false;
    }
  }

  private get callSessionEvents$() {
    return this.cachedObservable('callSessionEvents$', () =>
      this.clientSession.signalingEvent$.pipe(
        filter((event) => this.isCallSessionEvent(event)),
        tap((event) => {
          logger.debug('[Call] Received call session event:', event);
        }),
        takeUntil(this.destroyed$),
        share()
      )
    );
  }

  /** Observable of call-updated events. */
  public get callUpdated$(): Observable<CallUpdatedPayload> {
    return this.publicCachedObservable('callUpdated$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isCallUpdatedMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Observable of member-joined events, emitted when a remote participant joins the call. */
  public get memberJoined$(): Observable<MemberJoinedPayload> {
    return this.publicCachedObservable('memberJoined$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isMemberJoinedMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Observable of member-left events, emitted when a participant leaves the call. */
  public get memberLeft$(): Observable<MemberLeftPayload> {
    return this.publicCachedObservable('memberLeft$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isMemberLeftMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }
  /** Observable of member-updated events (mute, volume, etc.). */
  public get memberUpdated$(): Observable<MemberUpdatedPayload> {
    return this.publicCachedObservable('memberUpdated$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isMemberUpdatedMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Observable of member-talking events (speech start/stop). */
  public get memberTalking$(): Observable<MemberTalkingPayload> {
    return this.publicCachedObservable('memberTalking$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isMemberTalkingMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Observable of call state-change events. */
  public get callStates$(): Observable<CallStatePayload> {
    return this.publicCachedObservable('callStates$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isCallStateMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Observable of layout-changed events. */
  public get layoutUpdates$(): Observable<LayoutChangedPayload> {
    return this.publicCachedObservable('layoutUpdates$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isLayoutChangedMetadata, 'params'),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Underlying `RTCPeerConnection`, for advanced use cases. */
  public get rtcPeerConnection(): RTCPeerConnection | undefined {
    return this.vertoManager.mainPeerConnection.peerConnection;
  }
  /** Observable of raw signaling events as plain objects. */
  public get signalingEvent$(): Observable<Record<string, unknown>> {
    return this.publicCachedObservable('signalingEvent$', () =>
      this.callEvent$.pipe(
        map((event) => JSON.parse(JSON.stringify(event)) as Record<string, unknown>)
      )
    );
  }

  // ===========================================================================
  // Custom event subscriptions (Section 18)

  /**
   * Subscribe to a custom signaling event type on this call.
   *
   * Returns a cached observable that filters `callSessionEvents$` for events
   * whose `event_type` matches the given string. The observable completes
   * when the call is destroyed.
   *
   * Unlike `signalingEvent$` (which only emits known call-level event types),
   * this method also matches custom/user-defined event types.
   *
   * The SDK does not validate event type strings --- the server decides
   * whether a given type is valid.
   *
   * @param eventType - The event type to subscribe to (e.g. `'my.custom.event'`).
   * @returns An observable that emits matching signaling events.
   *
   * @example
   * ```ts
   * call.subscribe('my.custom.event').subscribe(event => {
   *   console.log('Custom event:', event);
   * });
   * ```
   */
  public subscribe(eventType: string): Observable<Record<string, unknown>> {
    const cached = this._customSubscriptions.get(eventType);
    if (cached) {
      return cached;
    }

    const filtered$ = this.callSessionEvents$.pipe(
      filter((event) => (event as { event_type?: string }).event_type === eventType),
      map((event) => JSON.parse(JSON.stringify(event)) as Record<string, unknown>),
      takeUntil(this._destroyed$)
    );

    // Send verto.subscribe to the server to add this event type mid-call.
    // The server decides whether the event type is valid — we don't validate.
    // Only cache on success: if the RPC fails we want the next call to retry
    // rather than returning a dead observable that will never emit.
    this._sendVertoSubscribe(eventType).then(
      () => {
        this._customSubscriptions.set(eventType, filtered$);
      },
      (error: unknown) => {
        this._customSubscriptions.delete(eventType);
        logger.warn(`[Call] verto.subscribe for '${eventType}' failed, not caching:`, error);
      }
    );

    // Temporarily cache so concurrent subscribe(eventType) calls share the
    // same in-flight observable. On RPC failure the entry is replaced above.
    this._customSubscriptions.set(eventType, filtered$);

    return filtered$;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public get webrtcMessages$() {
    return this.cachedObservable('webrtcMessages$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isWebrtcMessageMetadata, 'params'),
        tap((event) => logger.debug('[Call] Event is a WebRTC message event:', event)),
        takeUntil(this.destroyed$),
        share()
      )
    );
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public get callEvent$() {
    return this.cachedObservable('callEvent$', () =>
      this.callSessionEvents$.pipe(
        filterAs(isSignalwireCallMetadata, 'params'),
        tap((event) => logger.debug('[Call] Event is a call event:', event)),
        takeUntil(this.destroyed$),
        share()
      )
    );
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public get layoutEvent$() {
    return this.cachedObservable('layoutEvent$', () =>
      this.callEvent$.pipe(filterAs(isLayoutChangedMetadata, 'params'))
    );
  }
  /**
   * Hangs up the call and releases all resources.
   *
   * Sends a Verto `bye` to the server, transitions status to `'disconnecting'`,
   * then destroys the call. After this, the call instance is no longer usable.
   *
   * @example
   * ```ts
   * await call.hangup();
   * ```
   */
  async hangup(): Promise<void> {
    this._status$.next('disconnecting');
    try {
      await this.vertoManager.bye();
    } finally {
      this.destroy();
    }
  }
  /**
   * Sends DTMF digits on the call.
   *
   * @param dtmf - The digit string to send (e.g. `'1234#'`).
   *
   * @example
   * ```ts
   * await call.sendDigits('1234#');
   * ```
   */
  async sendDigits(dtmf: string): Promise<void> {
    return this.vertoManager.sendDigits(dtmf);
  }

  /** Observable of WebRTC-specific signaling messages. */

  /** Observable of call-level signaling events. */

  /** Observable of layout-changed signaling events. */

  /**
   * Accepts an inbound call, optionally overriding media options for the answer.
   *
   * @param options - Optional media constraints for the answer (audio/video).
   *
   * @example
   * ```ts
   * // Accept with defaults
   * call.answer();
   *
   * // Accept audio-only
   * call.answer({ audio: true, video: false });
   * ```
   * @see {@link reject} to decline the call instead.
   * @see {@link answered$} to observe the acceptance state.
   */
  public answer(options?: MediaOptions): void {
    this._answerMediaOptions = options;
    this._answered$.next(true);
  }

  /** Media options provided when answering. Used internally by the VertoManager. */
  public get answerMediaOptions(): MediaOptions | undefined {
    return this._answerMediaOptions;
  }

  /**
   * Rejects an inbound call, preventing media negotiation.
   *
   * @see {@link answer} to accept the call instead.
   * @see {@link answered$} to observe the rejection state.
   */
  public reject(): void {
    this._answered$.next(false);
  }

  /** Observable that emits `true` when answered, `false` when rejected. */
  public get answered$(): Observable<boolean> {
    return this.deferEmission(this._answered$.asObservable());
  }

  /**
   * Sets the call layout and participant positions.
   *
   * @param layout - Layout name (must be one of {@link layouts}).
   * @param positions - Map of member IDs to {@link VideoPosition} values.
   * @throws {InvalidParams} If the layout is not in the available {@link layouts}.
   *
   * @example
   * ```ts
   * await call.setLayout('grid-responsive', {
   *   [participantId]: 'reserved-0',
   * });
   * ```
   */
  async setLayout(layout: string, positions: Record<string, VideoPosition>): Promise<void> {
    if (!this.layouts.includes(layout)) {
      throw new InvalidParams(
        `Layout ${layout} is not available in the current call layouts: ${this.layouts.join(', ')}`
      );
    }

    const selfId = await firstValueFrom(
      this.selfId$.pipe(filter((id): id is string => id !== null))
    );

    await this.executeMethod(selfId, 'call.layout.set', {
      layout,
      positions
    });
  }

  /**
   * Transfers the call to another destination.
   *
   * @param options - Transfer configuration including the target destination.
   * @see {@link status$} to observe the transfer progress.
   */
  public async transfer(options: TransferOptions): Promise<void> {
    return this.vertoManager.transfer(options);
  }

  // =========================================================================
  // Local audio pipeline — mic gain, level meter, speaking VAD, PTT
  // =========================================================================

  /**
   * Set the local microphone gain as a percentage applied before transmission.
   *
   *   - `0`   = silent
   *   - `100` = unity (no change, default)
   *   - `200` = 2× digital boost (max; expect clipping / noise amplification)
   *
   * Values are clamped to [0, 200]. Engages the local audio pipeline on
   * first use (one-time cost).
   *
   * Note: this is a **digital** multiplier applied in a Web Audio GainNode
   * between your mic track and the RTCRtpSender — it does not change the
   * physical mic's hardware sensitivity. Browsers' autoGainControl can
   * fight the setting; call {@link setAutoGainControl}(false) for
   * predictable behaviour.
   *
   * @param value - Gain percentage (0..200; 100 = unity).
   */
  public setLocalMicrophoneGain(value: number): void {
    const pipeline = this.vertoManager.ensureLocalAudioPipeline();
    if (!pipeline) {
      logger.warn('[Call] setLocalMicrophoneGain: audio pipeline unavailable');
      return;
    }
    const percent = Math.max(0, Math.min(200, value));
    pipeline.setGain(percent / 100);
  }

  /** Observable of the current local microphone gain (0..200, where 100 = unity). */
  public get localMicrophoneGain$(): Observable<number> {
    const pipeline = this.vertoManager.ensureLocalAudioPipeline();
    if (!pipeline) {
      return of(100).pipe(takeUntil(this._destroyed$));
    }
    // No share() here: pipeline.gain$ is a BehaviorSubject, so each subscriber
    // is a cheap fan-out that receives the current value on subscribe. Adding
    // share() would route late subscribers through a plain Subject and they'd
    // miss the replay until the next setGain().
    return this.publicCachedObservable('localMicrophoneGain$', () =>
      pipeline.gain$.pipe(
        map((multiplier) => multiplier * 100),
        takeUntil(this._destroyed$)
      )
    );
  }

  /**
   * Observable of the RMS audio level of the local microphone, 0..1.
   * Emits at ~30fps while a mic track is active. Engages the local audio
   * pipeline on first subscription.
   */
  public get localAudioLevel$(): Observable<number> {
    const pipeline = this.vertoManager.ensureLocalAudioPipeline();
    if (!pipeline) {
      return of(0).pipe(takeUntil(this._destroyed$));
    }
    return this.publicCachedObservable('localAudioLevel$', () =>
      pipeline.level$.pipe(takeUntil(this._destroyed$), share())
    );
  }

  /**
   * Observable that is `true` while the local participant is speaking
   * (RMS level above the VAD threshold, with hold time to avoid flicker).
   */
  public get localSpeaking$(): Observable<boolean> {
    const pipeline = this.vertoManager.ensureLocalAudioPipeline();
    if (!pipeline) {
      return of(false).pipe(takeUntil(this._destroyed$));
    }
    return this.publicCachedObservable('localSpeaking$', () =>
      pipeline.speaking$.pipe(takeUntil(this._destroyed$), share())
    );
  }

  /**
   * Enable push-to-talk: while {@link setPushToTalkActive} has been called
   * with `false`, the microphone gain is forced to 0; calling
   * {@link setPushToTalkActive} with `true` restores the configured gain.
   * Use this instead of mute/unmute for instant talk/silence transitions
   * because it doesn't rebuild the track.
   *
   * This method installs the pipeline but does not attach any keyboard
   * listener — consumers bind the key themselves and call
   * {@link setPushToTalkActive} on keydown/keyup.
   */
  public enablePushToTalk(): void {
    const pipeline = this.vertoManager.ensureLocalAudioPipeline();
    if (!pipeline) {
      logger.warn('[Call] enablePushToTalk: audio pipeline unavailable');
      return;
    }
    // Start in the "released" state — caller must set pushToTalkActive(true)
    // to transmit. This matches the mental model of a radio mic: released = silent.
    pipeline.setPTTActive(false);
    this._pushToTalkEnabled = true;
  }

  /** Disable push-to-talk; mic gain returns to the configured value. */
  public disablePushToTalk(): void {
    // Restore normal transmission — setPTTActive(true) means "audio passes through".
    this.vertoManager.localAudioPipeline?.setPTTActive(true);
    this._pushToTalkEnabled = false;
  }

  /**
   * While push-to-talk is enabled, sets the talk state. `true` = transmitting,
   * `false` = silent. No-op if push-to-talk has not been enabled.
   */
  public setPushToTalkActive(active: boolean): void {
    if (!this._pushToTalkEnabled) return;
    this.vertoManager.localAudioPipeline?.setPTTActive(active);
  }

  /**
   * Toggle echo cancellation on the local mic at runtime. Applied via
   * `track.applyConstraints`; browsers that don't honour runtime constraints
   * (notably iOS Safari) fall back to re-acquiring the track with the new
   * constraint set and plumbing the replacement through the local audio
   * pipeline if one is active.
   */
  public async setEchoCancellation(enabled: boolean): Promise<void> {
    await this.vertoManager.updateMediaConstraints({ audio: { echoCancellation: enabled } });
  }

  /** Toggle browser noise suppression on the local mic at runtime. */
  public async setNoiseSuppression(enabled: boolean): Promise<void> {
    await this.vertoManager.updateMediaConstraints({ audio: { noiseSuppression: enabled } });
  }

  /** Toggle browser automatic gain control on the local mic at runtime. */
  public async setAutoGainControl(enabled: boolean): Promise<void> {
    await this.vertoManager.updateMediaConstraints({ audio: { autoGainControl: enabled } });
  }

  /**
   * Observable of the aggregate remote audio level, 0..1 RMS. The server
   * delivers a single mixed audio stream for all remote participants — this
   * meter reports that mix. Per-participant audio is not available client-side.
   *
   * Engages a shared AudioContext on first subscription (cheap — one
   * AnalyserNode, no GainNode, no destination) so it does not affect the
   * caller's audio element playback.
   */
  public get remoteAudioLevel$(): Observable<number> {
    return this.publicCachedObservable('remoteAudioLevel$', () => {
      this._remoteAudioMeter ??= new RemoteAudioMeter();
      const meter = this._remoteAudioMeter;

      this.subscribeTo(this.vertoManager.remoteStream$, (stream) => {
        meter.setStream(stream);
      });

      return meter.level$.pipe(takeUntil(this._destroyed$), share());
    });
  }

  /** Destroys the call, releasing all resources and subscriptions. */
  public destroy(): void {
    if (this._status$.value === 'destroyed') return;
    this._status$.next('destroyed');

    // Destroy resilience subsystems
    this.stopResilienceSubsystems();
    this._remoteAudioMeter?.destroy();
    this._remoteAudioMeter = null;

    this.vertoManager.destroy();
    this.callEventsManager.destroy();
    super.destroy();
  }

  /**
   * @internal Send a verto.subscribe message to add an event type to the
   * server's subscription list for this call. Returns the underlying RPC
   * promise so callers can decide whether to cache the observable on success
   * or retry on failure.
   */
  private async _sendVertoSubscribe(eventType: string): Promise<void> {
    const message = VertoSubscribe({
      sessid: this.id,
      eventChannel: [eventType]
    });
    const params = {
      callID: this.id,
      node_id: this.vertoManager.nodeId ?? '',
      message
    };
    await this.clientSession.execute(WebrtcVerto(params));
  }
}
