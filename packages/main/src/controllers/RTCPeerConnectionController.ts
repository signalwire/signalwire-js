/* eslint-disable max-lines */
import {
  auditTime,
  defer,
  exhaustMap,
  filter,
  firstValueFrom,
  from,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
  skipWhile,
  merge,
  race,
  timer
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { ICEGatheringController } from './ICEGatheringController';
import { LocalAudioPipeline } from './LocalAudioPipeline';
import { LocalStreamController } from './LocalStreamController';
import { TransceiverController } from './TransceiverController';
import { Destroyable } from '../behaviors/Destroyable';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import { ICE_GATHERING_COMPLETE_TIMEOUT_MS } from '../core/constants';
import { DependencyError, InvalidParams, MediaAccessError, MediaTrackError } from '../core/errors';
import {
  enableStereoOpus,
  extractMediaDirectionsFromSDP,
  isValidLocalDescription,
  setCodecPreferences
} from '../helpers/SDPHelper';
import { filterNull } from '../operators';
import { getLogger } from '../utils/logger';
import { toError } from '../utils/toError';

import type { RTCPeerConnectionPropose, RTCPeerConnectionType } from '../core/types/call.types';
import type { MediaDirections, MediaOptions } from '../core/types/media.types';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';
import type { Observable } from 'rxjs';

const logger = getLogger();

export interface RTCPeerConnectionControllerOptions extends MediaOptions {
  callId?: string;
  rtcConfiguration?: RTCConfiguration;
  simulcast?: boolean;
  sfu?: boolean;
  msStreamsNumber?: number;
  propose: RTCPeerConnectionPropose;
  iceServers?: RTCIceServer[];
  disableUdpIceServers?: boolean;
  relayOnly?: boolean;
  iceCandidateTimeout?: number;
  iceGatheringTimeout?: number;
  webRTCApiProvider?: WebRTCApiProvider;
  /** Per-call preferred video codecs (overrides global preferences). */
  preferredVideoCodecs?: string[];
  /** Per-call preferred audio codecs (overrides global preferences). */
  preferredAudioCodecs?: string[];
  /** Per-call stereo Opus setting (overrides global preferences). */
  stereo?: boolean;
}

export type RTCPeerConnectionControllerOptionsPartial = Partial<RTCPeerConnectionControllerOptions>;

export interface UpdateSDPStatusParams {
  status: 'received' | 'sent' | 'failed';
  sdp?: string;
}

export class RTCPeerConnectionController extends Destroyable {
  public readonly id: string;
  public firstSDPExchangeCompleted = false;
  public sdpInit?: RTCSessionDescriptionInit;
  private negotiationNeeded$ = this.createSubject<void>();
  private deviceController: DeviceController;
  private localStreamController: LocalStreamController;
  // Transceiver controller - initialized lazily when peerConnection is created
  private transceiverController?: TransceiverController;
  public readonly localDescription$: Observable<RTCSessionDescription | null> = defer(() =>
    from(this.init())
  ).pipe(
    switchMap(() =>
      // Wait for ICE negotiation before emitting localDescription
      this.iceGatheringController.iceCandidatesState$.pipe(
        filter((iceCandidateState) => !['new', 'gathering'].includes(iceCandidateState)),
        tap(() => {
          this.negotiationEnded();
        }),
        // Only emit when signaling state is 'have-local-offer'
        filter(() => this.shouldEmitLocalDescription),
        map(() => this.peerConnection?.localDescription),
        filterNull(),
        tap((desc) => {
          if (desc.type === 'answer') {
            // Once the answer is emitted, switch type to offer for future negotiations
            this._type = 'offer';
          }
        })
      )
    ),
    shareReplay(1),
    takeUntil(this.destroyed$)
  );
  public peerConnection?: RTCPeerConnection;
  private initPromise?: Promise<void>;
  private connectionTimeout = 3_000;
  private connectionTimer?: ReturnType<typeof setTimeout>;
  private oniceconnectionstatechangeHandler = () => {
    if (this.peerConnection) {
      const { iceConnectionState } = this.peerConnection;
      logger.debug(
        `[RTCPeerConnectionController] ICE connection state changed to: ${iceConnectionState}`
      );
      this._iceConnectionState$.next(this.peerConnection.iceConnectionState);
    }
  };
  private onconnectionstatechangeHandler = () => {
    if (this.peerConnection) {
      const { connectionState } = this.peerConnection;
      logger.debug(`[RTCPeerConnectionController] Connection state changed to: ${connectionState}`);
      if (connectionState === 'connected') {
        this.removeConnectionTimer();
      }
      this._connectionState$.next(this.peerConnection.connectionState);
    }
  };
  private onsignalingstatechangeHandler = () => {
    logger.debug(
      `[RTCPeerConnectionController] Signaling state changed to: ${this.peerConnection?.signalingState}`
    );
  };
  private onicegatheringstatechangeHandler = () => {
    if (this.peerConnection) {
      this._iceGatheringState$.next(this.peerConnection.iceGatheringState);
    }
  };
  private onnegotiationneededHandler = (event: unknown) => {
    logger.debug('[RTCPeerConnectionController] Negotiation needed event received.', event);
    this.negotiationNeeded$.next();
  };
  private updateSelectedInputDevice = async (
    kind: 'audio' | 'video',
    deviceInfo: MediaDeviceInfo | null
  ): Promise<void> => {
    try {
      const { localStream } = this;
      if (!localStream) {
        logger.warn(
          '[RTCPeerConnectionController] No local stream available to update input device.'
        );
        return;
      }

      logger.debug(
        `[RTCPeerConnectionController] Updating selected ${kind} input device:`,
        localStream.getTracks()
      );
      // Stop existing audio tracks
      const track = localStream.getTracks().find((track: MediaStreamTrack) => track.kind === kind);

      if (track) {
        this.transceiverController?.stopTrackSender(kind);
        this.localStreamController.removeTrack(track.id);
        logger.debug(
          `[RTCPeerConnectionController] Stopped existing ${kind} track: ${track.id}`,
          localStream.getTracks()
        );

        if (!deviceInfo) {
          logger.debug(`[RTCPeerConnectionController] ${kind} input device selected: none`);
          return;
        }

        const stream = await this.getUserMedia({
          [kind]: {
            ...track.getConstraints(),
            ...this.deviceController.deviceInfoToConstraints(deviceInfo)
          }
        });

        const streamTrack = stream.getTracks().find((t) => t.kind === kind);

        if (streamTrack) {
          logger.debug(`[RTCPeerConnectionController] Adding new ${kind} track: ${streamTrack.id}`);
          this.localStreamController.addTrack(streamTrack);
          await this.transceiverController?.replaceSenderTrack(kind, streamTrack);
          logger.debug(
            `[RTCPeerConnectionController] Added new ${kind} track: ${streamTrack.id}`,
            this.localStream?.getTracks()
          );
        }
      }

      logger.debug(
        `[RTCPeerConnectionController] ${kind} input device selected:`,
        deviceInfo?.label
      );
    } catch (error) {
      logger.error(`[RTCPeerConnectionController] Failed to select ${kind} input device:`, error);
      // Mid-call track op: non-fatal — the call continues with the old device.
      this._errors$.next(new MediaTrackError('updateSelectedInputDevice', kind, error));
      throw error;
    }
  };
  private _isNegotiating$ = this.createBehaviorSubject<boolean>(false);
  private _iceGatheringController?: ICEGatheringController;
  private _memberId: string | null = null;
  private _type: RTCPeerConnectionType;
  // Observable state streams - exposed as public observables
  private _iceConnectionState$ = this.createReplaySubject<RTCIceConnectionState>(1);
  private _connectionState$ = this.createReplaySubject<RTCPeerConnectionState>(1);
  private _signalingState$ = this.createReplaySubject<RTCSignalingState>(1);
  private _iceGatheringState$ = this.createReplaySubject<RTCIceGatheringState>(1);
  // Error stream
  private _errors$ = this.createReplaySubject<Error>(1);
  // ICE candidates stream
  private _iceCandidates$ = this.createReplaySubject<RTCIceCandidate[]>(1);
  // Initialization state
  private _initialized$ = this.createReplaySubject<boolean>(1);
  // Remote description
  private _remoteDescription$ = this.createReplaySubject<RTCSessionDescription | null>(1);
  private _remoteStream$ = this.createBehaviorSubject<MediaStream | null>(null);
  private _remoteOfferMediaDirections: MediaDirections | null = null;
  private _localAudioPipeline: LocalAudioPipeline | null = null;
  constructor(
    protected options: RTCPeerConnectionControllerOptionsPartial = {},
    remoteSessionDescription?: string,
    deviceController?: DeviceController
  ) {
    super();
    this.deviceController = deviceController ?? ({} as DeviceController);
    this.id = options.callId ?? uuid();
    this._type = remoteSessionDescription ? 'answer' : 'offer';

    this.sdpInit = remoteSessionDescription
      ? {
          type: 'offer',
          sdp: remoteSessionDescription
        }
      : undefined;

    this._remoteOfferMediaDirections = remoteSessionDescription
      ? extractMediaDirectionsFromSDP(remoteSessionDescription)
      : null;

    // For inbound calls, derive send/receive defaults from the remote offer directions.
    // Remote 'sendrecv' → remote sends (we receive) AND remote receives (we send)
    // Remote 'sendonly' → remote sends (we receive) but doesn't receive (we don't send)
    // Remote 'recvonly' → remote receives (we send) but doesn't send (we don't receive)
    const offerDefaults = this._remoteOfferMediaDirections
      ? {
          audio: this._remoteOfferMediaDirections.audio.includes('recv'),
          video: this._remoteOfferMediaDirections.video.includes('recv'),
          receiveAudio: this._remoteOfferMediaDirections.audio.includes('send'),
          receiveVideo: this._remoteOfferMediaDirections.video.includes('send')
        }
      : {};

    this.options = {
      ...options,
      audio: options.audio ?? offerDefaults.audio,
      video: options.video ?? offerDefaults.video,
      receiveAudio:
        options.receiveAudio ??
        offerDefaults.receiveAudio ??
        PreferencesContainer.instance.receiveAudio,
      receiveVideo:
        options.receiveVideo ??
        offerDefaults.receiveVideo ??
        PreferencesContainer.instance.receiveVideo
    };

    // Initialize the local stream controller
    this.localStreamController = new LocalStreamController({
      propose: this.propose,
      inputAudioStream: this.options.inputAudioStream,
      inputVideoStream: this.options.inputVideoStream,
      inputAudioDeviceConstraints: this.inputAudioDeviceConstraints,
      inputVideoDeviceConstraints: this.inputVideoDeviceConstraints,
      getUserMedia: async (constraints: MediaStreamConstraints) => this.getUserMedia(constraints),
      getDisplayMedia: async (options: DisplayMediaStreamOptions) => this.getDisplayMedia(options)
    });
  }

  private get iceGatheringController(): ICEGatheringController {
    if (!this._iceGatheringController) {
      throw new DependencyError('ICEGatheringController is not initialized');
    }
    return this._iceGatheringController;
  }

  private get shouldEmitLocalDescription(): boolean {
    if (!this.peerConnection) {
      return false;
    }

    const { localDescription, signalingState } = this.peerConnection;

    if (!localDescription || !isValidLocalDescription(localDescription.sdp)) {
      return false;
    }

    return (
      (localDescription.type === 'offer' && signalingState === 'have-local-offer') ||
      (localDescription.type === 'answer' && signalingState === 'stable')
    );
  }

  private removeConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
  }

  public setMemberId(memberId: string | null): void {
    this._memberId = memberId;
  }

  public get memberId(): string | null {
    return this._memberId;
  }

  public stopTrackSender(
    kind: 'audio' | 'video' | 'both',
    options = { updateTransceiverDirection: false }
  ): void {
    // When the local audio pipeline is engaged, the audio sender's track is
    // pipeline.outputTrack (a synthetic track from a MediaStreamAudioDestinationNode).
    // The default mute path would call sender.track.stop(), which permanently
    // ends that destination track and breaks the pipeline. Instead, stop the
    // raw mic track (releases the OS mic light) and disconnect the pipeline
    // input — the sender stays pointed at the still-alive outputTrack and
    // emits silence until the pipeline gets a fresh raw input on unmute.
    const audioCovered = kind === 'audio' || kind === 'both';
    if (audioCovered && this._localAudioPipeline) {
      this.stopRawAudioInputForPipeline();
    }
    if (!audioCovered) {
      this.transceiverController?.stopTrackSender(kind, options);
    } else if (kind === 'both') {
      this.transceiverController?.stopTrackSender('video', options);
    } else if (!this._localAudioPipeline) {
      // Pure audio mute and no pipeline → use the default path.
      this.transceiverController?.stopTrackSender(kind, options);
    }
  }

  private stopRawAudioInputForPipeline(): void {
    const rawTracks = this.localStreamController.localAudioTracks;
    for (const track of rawTracks) {
      if (track.readyState === 'live') {
        track.stop();
        this.localStreamController.removeTrack(track.id);
      }
    }
    this._localAudioPipeline?.setInputTrack(null);
  }

  public get isNegotiating$(): Observable<boolean> {
    return this._isNegotiating$.asObservable();
  }

  public get isNegotiating(): boolean {
    return this._isNegotiating$.value;
  }

  public updateMediaDevicesOptions(options: MediaOptions): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  public get iceGatheringState$(): Observable<RTCIceGatheringState> {
    return this.cachedObservable('iceGatheringState$', () =>
      this._iceGatheringState$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get mediaTrackEnded$(): Observable<MediaStreamTrack> {
    return this.cachedObservable('mediaTrackEnded$', () =>
      this.localStreamController.mediaTrackEnded$.pipe(takeUntil(this.destroyed$))
    );
  }

  public get errors$(): Observable<Error> {
    return this.cachedObservable('errors$', () =>
      this._errors$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get iceCandidates$(): Observable<RTCIceCandidate[]> {
    return this.cachedObservable('iceCandidates$', () =>
      this._iceCandidates$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get initialized$(): Observable<boolean> {
    return this.cachedObservable('initialized$', () =>
      this._initialized$.asObservable().pipe(
        filter((initialized) => initialized),
        takeUntil(this.destroyed$)
      )
    );
  }

  public get remoteDescription$(): Observable<RTCSessionDescription | null> {
    return this.cachedObservable('remoteDescription$', () =>
      this._remoteDescription$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get localStream$(): Observable<MediaStream | null> {
    return this.cachedObservable('localStream$', () =>
      this.localStreamController.localStream$.pipe(takeUntil(this.destroyed$))
    );
  }

  public get remoteStream$(): Observable<MediaStream | null> {
    return this.cachedObservable('remoteStream$', () =>
      this._remoteStream$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get localAudioTracks$(): Observable<MediaStreamTrack[]> {
    return this.cachedObservable('localAudioTracks$', () =>
      this.localStreamController.localAudioTracks$.pipe(takeUntil(this.destroyed$))
    );
  }

  public get localVideoTracks$(): Observable<MediaStreamTrack[]> {
    return this.cachedObservable('localVideoTracks$', () =>
      this.localStreamController.localVideoTracks$.pipe(takeUntil(this.destroyed$))
    );
  }

  public get iceConnectionState$(): Observable<RTCIceConnectionState> {
    return this.cachedObservable('iceConnectionState$', () =>
      this._iceConnectionState$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get connectionState$(): Observable<RTCPeerConnectionState> {
    return this.cachedObservable('connectionState$', () =>
      this._connectionState$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get signalingState$(): Observable<RTCSignalingState> {
    return this.cachedObservable('signalingState$', () =>
      this._signalingState$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  public get type(): RTCPeerConnectionType {
    return this._type;
  }

  public get propose(): RTCPeerConnectionPropose {
    return this.options.propose ?? 'main';
  }

  public get isAdditionalDevice(): boolean {
    return this.propose === 'additional-device';
  }

  public get isMainDevice(): boolean {
    return this.propose === 'main';
  }

  public get isScreenShare(): boolean {
    return this.propose === 'screenshare';
  }

  protected get iceServers(): RTCIceServer[] {
    if (!this.options.disableUdpIceServers) {
      return this.options.iceServers ?? [];
    }
    const tcpTransportParam = 'transport=tcp';

    // When disabling UDP, keep only URLs that explicitly specify transport=tcp
    // URLs without a transport parameter default to UDP and should be filtered out
    return (this.options.iceServers ?? []).map((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return {
        ...server,
        urls: urls.filter((url) => url.includes(tcpTransportParam))
      } as RTCIceServer;
    });
  }

  private get rtcConfiguration(): RTCConfiguration {
    // Destructure to exclude iceServers from options spread, since we use the filtered this.iceServers
    const { iceServers: _iceServers, ...restOptions } = this.options;
    return {
      bundlePolicy: 'max-compat',
      iceCandidatePoolSize: 10,
      iceServers: this.iceServers,
      iceTransportPolicy: this.options.relayOnly ? 'relay' : 'all',
      //@ts-expect-error -- Ignore ---
      sdpSemantics: 'unified-plan',
      ...restOptions
    };
  }

  public get receiveVideo(): boolean {
    return Boolean(this.options.receiveVideo);
  }

  public get receiveAudio(): boolean {
    return Boolean(this.options.receiveAudio);
  }

  public get localStream(): MediaStream | null {
    return this.localStreamController.localStream;
  }

  public get remoteStream(): MediaStream | null {
    return this._remoteStream$.value;
  }

  private get inputAudioDeviceConstraints(): MediaTrackConstraints | boolean {
    if (this.options.audio === false && !this.options.inputAudioDeviceConstraints) {
      return false;
    }
    // Section 5.9: When device is disabled, return false (receive-only)
    const deviceConstraints = this.deviceController.selectedAudioInputDeviceConstraints;
    if (deviceConstraints === false) {
      return false;
    }
    const audioBase =
      typeof this.options.inputAudioDeviceConstraints === 'object'
        ? this.options.inputAudioDeviceConstraints
        : {};
    const audioDevice = typeof deviceConstraints === 'object' ? deviceConstraints : {};
    return {
      ...audioBase,
      ...audioDevice
    };
  }

  private get inputVideoDeviceConstraints(): MediaTrackConstraints | boolean {
    if (!this.options.video && !this.options.inputVideoDeviceConstraints) {
      return false;
    }
    // Section 5.9: When device is disabled, return false (receive-only)
    const deviceConstraints = this.deviceController.selectedVideoInputDeviceConstraints;
    if (deviceConstraints === false) {
      return false;
    }
    const videoBase =
      typeof this.options.inputVideoDeviceConstraints === 'object'
        ? this.options.inputVideoDeviceConstraints
        : {};
    const videoDevice = typeof deviceConstraints === 'object' ? deviceConstraints : {};
    return {
      ...videoBase,
      ...videoDevice
    };
  }

  private get WebRTCPeerConnectionConstructor(): typeof RTCPeerConnection {
    return this.options.webRTCApiProvider?.RTCPeerConnection ?? RTCPeerConnection;
  }

  private get offerOptions(): RTCOfferOptions {
    const options: RTCOfferOptions = {
      iceRestart: this.firstSDPExchangeCompleted ? true : undefined
    };
    switch (this.propose) {
      case 'screenshare':
      case 'additional-device':
        return {
          ...options,
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        };
      case 'main':
      default:
        return {
          ...options,
          offerToReceiveAudio: this.options.receiveAudio ?? true,
          offerToReceiveVideo:
            this.options.receiveVideo ?? Boolean(this.inputVideoDeviceConstraints)
        };
    }
  }

  private get answerOptions(): RTCAnswerOptions {
    return {
      iceRestart: this.firstSDPExchangeCompleted ? true : undefined
    };
  }

  /**
   * Initialize the RTCPeerConnection and setup event listeners.
   * Called automatically when localDescription$ is subscribed to (deferred pattern).
   * Uses Promise memoization to ensure initialization only happens once,
   * even if called concurrently.
   */
  private async init(): Promise<void> {
    this.initPromise ??= this.doInit();
    return this.initPromise;
  }

  /**
   * Internal initialization implementation.
   * Should only be called via init() to ensure single execution.
   */
  private async doInit(): Promise<void> {
    try {
      this.setupPeerConnection();

      this.subscribeTo(
        this.negotiationNeeded$.pipe(
          auditTime(0), //When updating multiple tracks, batches all the events together
          exhaustMap(async () => this.startNegotiation()) // Ignore new events while negotiation is ongoing
        ),
        {
          next: () => {
            logger.debug('[RTCPeerConnectionController] Start Negotiation completed successfully');
          },
          error: (error) => {
            logger.error('[RTCPeerConnectionController] Start Negotiation error:', error);
            this._errors$.next(toError(error));
          }
        }
      );

      this.subscribeTo(
        merge(
          this.deviceController.selectedAudioInputDevice$.pipe(
            map((deviceInfo) => ['audio', deviceInfo] as const)
          ),
          this.deviceController.selectedVideoInputDevice$.pipe(
            map((deviceInfo) => ['video', deviceInfo] as const)
          )
        ).pipe(
          // we only want to react to changes after the localstream is created
          // before that the device selection is handle int the localstream creation
          skipWhile(() => !this.localStreamController.localStream)
        ),
        async ([kind, deviceInfo]) => {
          logger.debug(`[RTCPeerConnectionController] Selected input device changed for:`, {
            kind,
            deviceInfo
          });
          await this.updateSelectedInputDevice(kind, deviceInfo);
        }
      );

      // For inbound calls: only setup remote tracks (ontrack handler) during init.
      // Local track setup is deferred to acceptInbound() so that:
      // 1. Remote description is set first, creating transceivers from the offer
      // 2. Local tracks reuse those transceivers instead of creating duplicates
      // 3. Media overrides can be applied before tracks are acquired
      if (this.type === 'answer' && this.sdpInit) {
        await this.setupRemoteTracks();

        this._initialized$.next(true);

        this.setupEventListeners();
        this._isNegotiating$.next(true);
        await this._setRemoteDescription(this.sdpInit);
      } else {
        await this.setupTrackHandling();

        this._initialized$.next(true);
      }
    } catch (error) {
      logger.error('[RTCPeerConnectionController] Initialization error:', error);
      this._errors$.next(toError(error));
      this.destroy();
    }
  }

  private setupPeerConnection() {
    this.peerConnection = new this.WebRTCPeerConnectionConstructor(this.rtcConfiguration);
    this.peerConnection.addEventListener('negotiationneeded', this.onnegotiationneededHandler);
    this._iceGatheringController = new ICEGatheringController(
      this.peerConnection,
      this.isNegotiating$,
      {
        iceCandidateTimeout: this.options.iceCandidateTimeout,
        iceGatheringTimeout: this.options.iceGatheringTimeout,
        relayOnly: this.options.relayOnly
      }
    );

    // Initialize the transceiver controller
    this.transceiverController = new TransceiverController({
      peerConnection: this.peerConnection,
      propose: this.propose,
      simulcast: this.options.simulcast,
      sfu: this.options.sfu,
      msStreamsNumber: this.options.msStreamsNumber,
      receiveAudio: this.receiveAudio,
      receiveVideo: this.receiveVideo,
      localStreamController: this.localStreamController,
      getInputAudioDeviceConstraints: () => this.inputAudioDeviceConstraints,
      getInputVideoDeviceConstraints: () => this.inputVideoDeviceConstraints,
      getUserMedia: async (constraints: MediaStreamConstraints) => this.getUserMedia(constraints),
      onError: (error: Error) => {
        this._errors$.next(error);
      }
    });
  }

  private async startNegotiation() {
    if (this.isNegotiating) {
      logger.debug('[RTCPeerConnectionController] Negotiation already in progress, skipping.');
      return;
    }

    this.setupEventListeners();

    if (this.type === 'answer') {
      logger.debug(
        '[RTCPeerConnectionController] This is an answer type still, skipping offer creation.'
      );
      return;
    }

    this._isNegotiating$.next(true);
    logger.debug('[RTCPeerConnectionController] Starting negotiation.');

    try {
      const { offerOptions } = this;
      logger.debug('[RTCPeerConnectionController] Creating offer with options:', offerOptions);
      await this.createOffer(offerOptions);
    } catch (error) {
      logger.error('[RTCPeerConnectionController] Error during negotiation:', error);
      this._errors$.next(toError(error));
    }
  }

  /**
   * Create an SDP offer and set it as local description.
   */
  private async createOffer(options?: RTCOfferOptions): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    const offer = await this.peerConnection.createOffer(options);
    await this.setLocalDescription(offer);

    // Note: localDescription will be emitted by setupEventListeners initial emission
    // and updated when ICE gathering state changes
  }

  public async updateAnswerStatus({ status, sdp }: UpdateSDPStatusParams): Promise<void> {
    let readyToConnect = status !== 'failed';

    try {
      if (status === 'received' && sdp) {
        logger.debug('[RTCPeerConnectionController] Received answer SDP:', sdp);
        await this._setRemoteDescription({
          type: 'answer',
          sdp
        });
      }
    } catch (error) {
      logger.error('[RTCPeerConnectionController] Error updating answer status:', error);
      this._errors$.next(toError(error));
      readyToConnect = false;
    } finally {
      if (readyToConnect) {
        this.readyToConnect();
      } else {
        this.iceGatheringController.restartICEGatheringWithRelayOnly();
      }
    }
  }

  public async updateOfferStatus({ status, sdp }: UpdateSDPStatusParams): Promise<void> {
    switch (status) {
      case 'received':
        this._type = 'answer';
        this.sdpInit = {
          type: 'offer',
          sdp: sdp
        };
        await this.handleOfferReceived();
        break;
      case 'failed':
        logger.error('[RTCPeerConnectionController] Offer failed to be processed by remote.');
        break;
      case 'sent':
      default:
      // No action needed for sent offers
    }
  }

  /**
   * Accept an inbound call by creating the SDP answer.
   * Optionally override media options before the answer is generated.
   * Must be called after initialization for inbound (answer-type) connections.
   */
  public async acceptInbound(mediaOverrides?: MediaOptions): Promise<void> {
    if (mediaOverrides) {
      const { audio, video, receiveAudio, receiveVideo, fallbackToReceiveOnly } = mediaOverrides;
      this.options = {
        ...this.options,
        ...(audio !== undefined ? { audio } : {}),
        ...(video !== undefined ? { video } : {}),
        ...(receiveAudio !== undefined ? { receiveAudio } : {}),
        ...(receiveVideo !== undefined ? { receiveVideo } : {}),
        ...(fallbackToReceiveOnly !== undefined ? { fallbackToReceiveOnly } : {})
      };
      this.transceiverController?.updateOptions({
        receiveAudio: this.receiveAudio,
        receiveVideo: this.receiveVideo
      });
      this.localStreamController.updateOptions({
        inputAudioDeviceConstraints: this.inputAudioDeviceConstraints,
        inputVideoDeviceConstraints: this.inputVideoDeviceConstraints
      });
    }

    // Setup local tracks after remote description is set and media overrides applied.
    // This ensures local tracks reuse transceivers from the remote offer
    // instead of creating duplicate transceivers via addTransceiver().
    await this.setupLocalTracks();

    const { answerOptions } = this;
    logger.debug(
      '[RTCPeerConnectionController] Creating inbound answer with options:',
      answerOptions
    );
    await this.createAnswer(answerOptions);
  }

  private async handleOfferReceived() {
    if (!this.sdpInit) {
      throw new DependencyError('SDP initialization parameters are not set');
    }

    this._isNegotiating$.next(true);
    await this._setRemoteDescription(this.sdpInit);

    const { answerOptions } = this;
    logger.debug('[RTCPeerConnectionController] Creating answer with options:', answerOptions);
    await this.createAnswer(answerOptions);
  }

  private readyToConnect() {
    this.firstSDPExchangeCompleted = true;
    this.connectionTimer = setTimeout(() => {
      this.removeConnectionTimer();
      if (this.peerConnection?.connectionState !== 'connected') {
        logger.debug(
          '[RTCPeerConnectionController] Connection timeout, restarting ICE gathering with relay only.'
        );
        this.iceGatheringController.restartICEGatheringWithRelayOnly();
      }
    }, this.connectionTimeout);
  }

  private async setRemoteDescriptionBefore(sdp: string = ''): Promise<string> {
    // TODO use the options hooks
    return Promise.resolve(sdp);
  }
  protected async setLocalDescription(params: RTCSessionDescriptionInit): Promise<void> {
    const finalLocal = await this.setLocalDescriptionBefore(params.sdp);
    return this.peerConnection?.setLocalDescription({
      ...params,
      sdp: finalLocal
    });
  }
  async setLocalDescriptionBefore(sdp: string = ''): Promise<string> {
    let result = sdp;

    // Per-call overrides take precedence, then global preferences
    const preferredAudioCodecs =
      this.options.preferredAudioCodecs ?? PreferencesContainer.instance.preferredAudioCodecs;
    const preferredVideoCodecs =
      this.options.preferredVideoCodecs ?? PreferencesContainer.instance.preferredVideoCodecs;
    const stereo = this.options.stereo ?? PreferencesContainer.instance.stereoAudio;

    // Apply codec reordering if preferences are set
    if (preferredAudioCodecs.length > 0 || preferredVideoCodecs.length > 0) {
      result = setCodecPreferences(result, preferredAudioCodecs, preferredVideoCodecs);
      logger.debug('[RTCPeerConnectionController] Applied codec preferences to SDP', {
        preferredAudioCodecs,
        preferredVideoCodecs
      });
    }

    // Apply stereo Opus if enabled
    if (stereo) {
      result = enableStereoOpus(result);
      logger.debug('[RTCPeerConnectionController] Applied stereo Opus to SDP');
    }

    return Promise.resolve(result);
  }
  /**
   * Create an SDP answer and set it as local description.
   */
  private async createAnswer(options?: RTCAnswerOptions): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    const answer = await this.peerConnection.createAnswer(options);
    await this.setLocalDescription(answer);
    // Note: localDescription will be emitted by setupEventListeners initial emission
    // and updated when ICE gathering state changes
  }
  /**
   * Setup event listeners on RTCPeerConnection for state changes.
   */
  private setupEventListeners(): void {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    // Emit initial states from the actual RTCPeerConnection
    this._iceConnectionState$.next(this.peerConnection.iceConnectionState);
    this._connectionState$.next(this.peerConnection.connectionState);
    this._signalingState$.next(this.peerConnection.signalingState);
    this._iceGatheringState$.next(this.peerConnection.iceGatheringState);
    // Note: localDescription is NOT emitted here - it will be emitted when ICE gathering completes
    this._remoteDescription$.next(this.peerConnection.remoteDescription);

    this.peerConnection.removeEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
    this.peerConnection.addEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
    this.peerConnection.removeEventListener(
      'iceconnectionstatechange',
      this.oniceconnectionstatechangeHandler
    );
    this.peerConnection.addEventListener(
      'iceconnectionstatechange',
      this.oniceconnectionstatechangeHandler
    );

    // Signaling state changes
    this.peerConnection.removeEventListener(
      'connectionstatechange',
      this.onconnectionstatechangeHandler
    );
    this.peerConnection.addEventListener(
      'connectionstatechange',
      this.onconnectionstatechangeHandler
    );

    this.peerConnection.removeEventListener(
      'signalingstatechange',
      this.onsignalingstatechangeHandler
    );

    this.peerConnection.addEventListener(
      'signalingstatechange',
      this.onsignalingstatechangeHandler
    );
  }

  private negotiationEnded() {
    this._isNegotiating$.next(false);
  }

  /**
   * Trigger an ICE restart through the existing negotiation pipeline.
   *
   * This creates an offer with iceRestart: true and goes through the full
   * SDP pipeline (setLocalDescription → ICE gathering → localDescription$ emission).
   * The caller should NOT send the SDP manually — the existing
   * setupLocalDescriptionHandler in VertoManager will pick up the emission
   * from localDescription$ and send it as a verto.modify.
   *
   * Unlike calling pc.createOffer/setLocalDescription directly, this method:
   * - Sets _isNegotiating$ so ICEGatheringController arms its timers
   * - Waits for ICE gathering to complete before localDescription$ emits
   * - Goes through setLocalDescriptionBefore() for any SDP munging
   */
  public async triggerIceRestart(relayOnly?: boolean): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    // Tier 3: constrain to relay candidates only (TURN servers).
    // setConfiguration() updates the ICE transport policy for the next gather.
    const policyChanged = relayOnly && !this.options.relayOnly;
    if (policyChanged) {
      try {
        this.peerConnection.setConfiguration({
          ...this.peerConnection.getConfiguration(),
          iceTransportPolicy: 'relay'
        });
        logger.debug('[RTCPeerConnectionController] ICE transport policy set to relay-only');
      } catch (error) {
        logger.warn('[RTCPeerConnectionController] Failed to set relay-only policy:', error);
      }
    }

    this.setupEventListeners();
    this._isNegotiating$.next(true);

    logger.debug(
      `[RTCPeerConnectionController] Triggering ICE restart${relayOnly ? ' (relay-only)' : ''}.`
    );

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.setLocalDescription(offer);
    } catch (error) {
      logger.error('[RTCPeerConnectionController] ICE restart offer failed:', error);
      this._errors$.next(toError(error));
      this.negotiationEnded();
      // Restore original policy on failure
      if (policyChanged) {
        this.restoreIceTransportPolicy();
      }
      throw error;
    }
    // Restore original policy only after gathering actually completes. setLocalDescription
    // resolves before the browser finishes gathering candidates, so restoring synchronously
    // here would let non-relay candidates leak back into the current gather — defeating
    // Tier-3 escalation. Wait for iceGatheringState === 'complete' (bounded by a timeout
    // so we don't leak the policy override if gathering never completes).
    if (policyChanged) {
      void firstValueFrom(
        race(
          this._iceGatheringState$.pipe(
            filter((state) => state === 'complete'),
            take(1)
          ),
          timer(ICE_GATHERING_COMPLETE_TIMEOUT_MS).pipe(map(() => 'timeout' as const))
        )
      )
        .then(() => this.restoreIceTransportPolicy())
        .catch((error: unknown) => {
          logger.warn(
            '[RTCPeerConnectionController] Error waiting for ICE gathering to complete:',
            error
          );
          this.restoreIceTransportPolicy();
        });
    }
  }

  private restoreIceTransportPolicy(): void {
    try {
      this.peerConnection?.setConfiguration({
        ...this.peerConnection.getConfiguration(),
        iceTransportPolicy: this.options.relayOnly ? 'relay' : 'all'
      });
      logger.debug('[RTCPeerConnectionController] ICE transport policy restored');
    } catch (error) {
      logger.warn('[RTCPeerConnectionController] Failed to restore ICE transport policy:', error);
    }
  }
  /**
   * Setup track handling for remote tracks.
   */
  private async setupTrackHandling(): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    await this.setupLocalTracks();

    await this.setupRemoteTracks();
  }

  private async setupLocalTracks(): Promise<void> {
    logger.debug('[RTCPeerConnectionController] Setting up local tracks/transceivers.');

    // Intentional receive-only call: nothing to send, so skip acquisition
    // (getUserMedia rejects when neither kind is requested).
    if (this.hasNoLocalMediaToSend()) {
      if (!this.receiveAudio && !this.receiveVideo) {
        // Degenerate configuration: nothing to send AND nothing to receive.
        throw new InvalidParams(
          'Call requests no media: enable audio/video or receiveAudio/receiveVideo'
        );
      }
      logger.debug(
        '[RTCPeerConnectionController] No local media requested; negotiating receive-only.'
      );
      this.setupReceiveOnlyTransceivers();
      return;
    }

    let localStream: MediaStream;
    try {
      localStream = this.localStream ?? (await this.localStreamController.buildLocalStream());
    } catch (error) {
      this.handleLocalMediaFailure(error);
      return;
    }

    if (this.transceiverController?.useAddStream ?? false) {
      logger.warn(
        '[RTCPeerConnectionController] Using deprecated addStream API to add local stream.'
      );
      //@ts-expect-error -- Ignore -- useAddStream checked if the deprecated API should be used
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.peerConnection?.addStream(localStream);
      // In case the browser doesn't fire negotiationneeded automatically
      if (!this.isNegotiating) {
        logger.debug(
          '[RTCPeerConnectionController] Forcing negotiationneeded after local tracks setup.'
        );
        this.negotiationNeeded$.next();
      }
      return;
    }

    for (const kind of ['audio', 'video']) {
      const tracks = (
        kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks()
      ).map((track, index) => ({ index, track }));
      for (const { index, track } of tracks) {
        this.localStreamController.addTrackEndedListener(track);
        if (this.transceiverController?.useAddTransceivers ?? false) {
          const transceivers =
            (kind === 'audio'
              ? this.transceiverController?.audioTransceivers
              : this.transceiverController?.videoTransceivers) ?? [];
          await this.transceiverController?.setupTransceiverSender(
            track,
            localStream,
            transceivers[index]
          );
        } else {
          logger.debug(
            `[RTCPeerConnectionController] Using addTrack for local ${kind} track:`,
            track.id
          );
          this.peerConnection?.addTrack(track, localStream);
        }
      }
    }
  }

  /** True for a main connection with no local media to send. */
  private hasNoLocalMediaToSend(): boolean {
    const hasInputStreams = Boolean(this.options.inputAudioStream ?? this.options.inputVideoStream);
    return (
      this.propose === 'main' &&
      !this.localStream &&
      !hasInputStreams &&
      !this.inputAudioDeviceConstraints &&
      !this.inputVideoDeviceConstraints
    );
  }

  /** The media kinds this connection wants to send: 'audiovideo' | 'video' | 'audio'. */
  private get requestedMediaKinds(): string {
    const wantsAudio = Boolean(this.inputAudioDeviceConstraints);
    const wantsVideo = Boolean(this.inputVideoDeviceConstraints);
    if (wantsAudio && wantsVideo) {
      return 'audiovideo';
    }
    return wantsVideo ? 'video' : 'audio';
  }

  /**
   * Handle a local media acquisition failure with a typed, semantically
   * accurate MediaAccessError created at the acquisition site:
   * - Auxiliary connections (screenshare / additional-device) throw a
   *   non-fatal error — VertoManager surfaces it and the call is unaffected.
   * - The main connection degrades to receive-only when allowed (default),
   *   otherwise fails with a fatal error.
   */
  private handleLocalMediaFailure(error: unknown): void {
    if (this.propose === 'screenshare') {
      throw new MediaAccessError('startScreenShare', 'screen', error, false);
    }
    if (this.propose === 'additional-device') {
      throw new MediaAccessError('addInputDevice', this.requestedMediaKinds, error, false);
    }
    const canReceive = this.receiveAudio || this.receiveVideo;
    const wantsFallback = this.options.fallbackToReceiveOnly ?? true;
    if (!(wantsFallback && canReceive)) {
      // Fatal: doInit's catch emits the error and destroys the connection.
      throw new MediaAccessError('acquireLocalMedia', this.requestedMediaKinds, error, true);
    }
    logger.warn(
      '[RTCPeerConnectionController] Local media unavailable; continuing receive-only:',
      error
    );
    this._errors$.next(
      new MediaAccessError('acquireLocalMedia', this.requestedMediaKinds, error, false)
    );
    this.setupReceiveOnlyTransceivers();
  }

  /**
   * Negotiate receive-only m-lines when there are no local tracks to send.
   * Only offer-type connections add transceivers — answer-type connections
   * reuse the transceivers created from the remote offer.
   */
  private setupReceiveOnlyTransceivers(): void {
    if (this.type !== 'offer') {
      return;
    }
    if (this.transceiverController?.useAddTransceivers ?? false) {
      this.peerConnection?.addTransceiver('audio', {
        direction: this.receiveAudio ? 'recvonly' : 'inactive'
      });
      this.peerConnection?.addTransceiver('video', {
        direction: this.receiveVideo ? 'recvonly' : 'inactive'
      });
    }
    // With no addTrack/addTransceiver call the browser may never fire
    // negotiationneeded — force the offer.
    if (!this.isNegotiating) {
      this.negotiationNeeded$.next();
    }
  }

  private async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const mediaDevices = this.options.webRTCApiProvider?.mediaDevices ?? navigator.mediaDevices;
    return mediaDevices.getUserMedia(constraints);
  }

  private async getDisplayMedia(options: DisplayMediaStreamOptions): Promise<MediaStream> {
    const mediaDevices = this.options.webRTCApiProvider?.mediaDevices ?? navigator.mediaDevices;
    if (!mediaDevices.getDisplayMedia) {
      throw new DependencyError('getDisplayMedia is not supported by the current WebRTC provider');
    }
    return mediaDevices.getDisplayMedia(options);
  }
  private async setupRemoteTracks(): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }
    this.peerConnection.ontrack = (event) => {
      logger.debug('[RTCPeerConnectionController] Remote track received:', event.track.kind);

      if (event.streams[0]) {
        this._remoteStream$.next(event.streams[0]);
      } else {
        const existingTracks = this._remoteStream$.value?.getTracks() ?? [];
        const newStream = new MediaStream([...existingTracks, event.track]);
        this._remoteStream$.next(newStream);
      }
    };

    await this.transceiverController?.setupRemoteTransceivers(this.type);
  }

  public async restoreTrackSender(kind: 'audio' | 'video' | 'both'): Promise<void> {
    // Mirror of stopTrackSender: when the pipeline is engaged, take the audio
    // path through pipeline.setInputTrack so the sender's outputTrack reference
    // stays stable across mute/unmute cycles. The default restoreTrackSender
    // would replaceTrack(newRaw) on the sender, which would unhook the
    // pipeline output for that one cycle.
    const audioCovered = kind === 'audio' || kind === 'both';
    if (audioCovered && this._localAudioPipeline) {
      await this.restoreRawAudioInputForPipeline();
    }
    if (!audioCovered) {
      await this.transceiverController?.restoreTrackSender(kind);
    } else if (kind === 'both') {
      await this.transceiverController?.restoreTrackSender('video');
    } else if (!this._localAudioPipeline) {
      // Pure audio unmute and no pipeline → use the default path.
      await this.transceiverController?.restoreTrackSender(kind);
    }
  }

  private async restoreRawAudioInputForPipeline(): Promise<void> {
    if (!this._localAudioPipeline) return;
    const constraints = this.transceiverController?.getConstraintsFor('audio') ?? {};
    let stream: MediaStream;
    try {
      stream = await this.getUserMedia({ audio: constraints });
    } catch (error) {
      logger.error(
        '[RTCPeerConnectionController] Failed to re-acquire mic for pipeline restore:',
        error
      );
      // Mid-call track op: non-fatal — the pipeline just stays silent.
      this._errors$.next(new MediaTrackError('restoreAudioPipelineInput', 'audio', error));
      return;
    }
    const newTrack = stream.getAudioTracks().at(0);
    if (!newTrack) return;
    this.localStreamController.addTrack(newTrack);
    this._localAudioPipeline.setInputTrack(newTrack);
  }

  /**
   * Return the lazily-created {@link LocalAudioPipeline}, constructing it on
   * first access. On creation the current audio sender's track is routed
   * through the pipeline (input → gain → analyser → destination) and the
   * sender is switched to emit the processed track. Returns `null` when no
   * audio sender exists yet (pre-negotiation).
   */
  public ensureLocalAudioPipeline(): LocalAudioPipeline | null {
    if (this._localAudioPipeline) {
      return this._localAudioPipeline;
    }
    if (!this.peerConnection) {
      return null;
    }
    try {
      this._localAudioPipeline = new LocalAudioPipeline();
    } catch (error) {
      logger.warn('[RTCPeerConnectionController] Failed to create LocalAudioPipeline:', error);
      return null;
    }
    this.subscribeTo(this.localStreamController.localAudioTracks$, () => {
      // Re-hook whenever the raw audio track changes (device switch,
      // mute/unmute reacquire). setInputTrack is called inside apply... so
      // the graph also rebuilds.
      void this.applyLocalAudioPipelineToSender();
    });
    void this.applyLocalAudioPipelineToSender();
    return this._localAudioPipeline;
  }

  /** The active LocalAudioPipeline, or null if it hasn't been created yet. */
  public get localAudioPipeline(): LocalAudioPipeline | null {
    return this._localAudioPipeline;
  }

  private async applyLocalAudioPipelineToSender(): Promise<void> {
    if (!this._localAudioPipeline || !this.peerConnection) {
      return;
    }
    const raw = this.localStreamController.localAudioTracks.at(0);
    this._localAudioPipeline.setInputTrack(raw ?? null);

    // Resolve the audio sender via TransceiverController when available — it
    // already filters audio transceivers reliably. Fall back to scanning
    // peerConnection.getSenders() for an audio track (matches the classic
    // addTrack path where no transceiver wrapper is tracked).
    const audioTransceiver = this.transceiverController?.audioTransceivers.at(0);
    const sender =
      audioTransceiver?.sender ??
      this.peerConnection.getSenders().find((s) => s.track?.kind === 'audio');
    if (!sender || !raw) {
      return;
    }
    try {
      await sender.replaceTrack(this._localAudioPipeline.outputTrack);
    } catch (error) {
      logger.warn(
        '[RTCPeerConnectionController] Failed to route audio sender through pipeline:',
        error
      );
    }
  }
  /**
   * Add a local media track to the peer connection.
   * @param track - The MediaStreamTrack to add
   */
  public addLocalTrack(track: MediaStreamTrack): void {
    if (!this.peerConnection) {
      const error = new DependencyError('RTCPeerConnection is not initialized');
      this._errors$.next(error);
      throw error;
    }

    try {
      // Add track to local stream controller
      const localStream = this.localStreamController.addTrack(track);

      // Add track to peer connection
      this.peerConnection.addTrack(track, localStream);

      logger.debug(`[RTCPeerConnectionController] ${track.kind} track added:`, track.id);
    } catch (error) {
      logger.error(`[RTCPeerConnectionController] Failed to add ${track.kind} track:`, error);
      // Mid-call track op: non-fatal — the call continues without the track.
      this._errors$.next(new MediaTrackError('addLocalTrack', track.kind, error));
      throw error;
    }
  }
  /**
   * Remove a local media track from the peer connection.
   * @param trackId - The ID of the track to remove
   */
  public removeLocalTrack(trackId: string): void {
    if (!this.peerConnection) {
      const error = new DependencyError('RTCPeerConnection is not initialized');
      this._errors$.next(error);
      throw error;
    }

    const sender = this.peerConnection.getSenders().find((sender) => sender.track?.id === trackId);
    if (!sender) {
      logger.debug(`[RTCPeerConnectionController] track not found: ${trackId}`);
      return;
    }

    try {
      // Remove sender from peer connection
      this.peerConnection.removeTrack(sender);

      // Remove track from local stream controller
      this.localStreamController.removeTrack(trackId);

      logger.debug(`[RTCPeerConnectionController] ${sender.track?.kind} track removed:`, trackId);
    } catch (error) {
      logger.error(
        `[RTCPeerConnectionController] Failed to remove ${sender.track?.kind} track:`,
        error
      );
      // Mid-call track op: non-fatal — the call continues as-is.
      this._errors$.next(
        new MediaTrackError('removeLocalTrack', sender.track?.kind ?? 'unknown', error)
      );
      throw error;
    }
  }
  /**
   * Replace all existing media tracks with a new media  track.
   * Convenience method for single-track scenarios.
   * @param track - The MediaStreamTrack to set
   */
  public setLocalTrack(track: MediaStreamTrack): void {
    // Remove all existing media tracks
    const existingTracks = [
      ...(track.kind === 'audio'
        ? this.localStreamController.localAudioTracks
        : this.localStreamController.localVideoTracks)
    ];
    for (const existingTrack of existingTracks) {
      this.removeLocalTrack(existingTrack.id);
    }

    // Add the new track
    this.addLocalTrack(track);
  }
  public async updateSendersConstraints(
    kind: 'audio' | 'video',
    constraints?: MediaTrackConstraints
  ): Promise<void> {
    await this.transceiverController?.updateSendersConstraints(kind, constraints);
  }

  /**
   * Replace the current audio track with a new one using the given constraints.
   * Used for server-pushed audio constraint changes where applyConstraints
   * fails on iOS Safari. Stops the current track, acquires a new one via
   * getUserMedia, and replaces the sender track.
   */
  public async replaceAudioTrackWithConstraints(constraints: MediaTrackConstraints): Promise<void> {
    const senders = this.peerConnection
      ?.getSenders()
      .filter((s) => s.track?.kind === 'audio' && s.track.readyState === 'live');

    if (!senders || senders.length === 0) {
      logger.warn('[RTCPeerConnectionController] No live audio sender to replace');
      return;
    }

    for (const sender of senders) {
      const oldTrack = sender.track;
      if (!oldTrack) continue;

      // Merge new constraints with current deviceId
      const currentSettings = oldTrack.getSettings();
      const { deviceId } = currentSettings;
      const mergedConstraints: MediaTrackConstraints = {
        ...oldTrack.getConstraints(),
        ...constraints,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      };

      // Stop old track
      const trackId = oldTrack.id;
      oldTrack.stop();
      this.localStreamController.removeTrack(trackId);

      // Acquire new track
      const stream = await this.getUserMedia({ audio: mergedConstraints });
      const newTrack = stream.getAudioTracks()[0];

      await sender.replaceTrack(newTrack);
      this.localStreamController.addTrack(newTrack);
      logger.debug(
        `[RTCPeerConnectionController] Audio track replaced for server-pushed params. New track: ${newTrack.id}`
      );
    }
  }

  /**
   * Clean up resources and close the peer connection.
   * Completes all observables to prevent memory leaks.
   */
  public destroy(): void {
    logger.debug(
      `[RTCPeerConnectionController] Destroying RTCPeerConnectionController. ${this.propose}`
    );
    this.removeConnectionTimer();
    this._iceGatheringController?.destroy();
    this._localAudioPipeline?.destroy();
    this._localAudioPipeline = null;
    this.localStreamController.destroy();
    this.transceiverController?.destroy();

    // Close peer connection
    if (this.peerConnection) {
      this.stopRemoteTracks();
      this.removeAllListeners();
      this.peerConnection.close();
      this.peerConnection = undefined;
    }

    // Call parent destroy to clean up subscriptions and complete destroyed$
    super.destroy();
  }
  private removeAllListeners() {
    if (this.peerConnection) {
      this.peerConnection.removeEventListener(
        'icegatheringstatechange',
        this.onicegatheringstatechangeHandler
      );
      this.peerConnection.removeEventListener(
        'iceconnectionstatechange',
        this.oniceconnectionstatechangeHandler
      );
      this.peerConnection.removeEventListener(
        'connectionstatechange',
        this.onconnectionstatechangeHandler
      );
      this.peerConnection.removeEventListener(
        'signalingstatechange',
        this.onsignalingstatechangeHandler
      );
      this.peerConnection.removeEventListener('negotiationneeded', this.onnegotiationneededHandler);
    }
  }

  private stopRemoteTracks() {
    const remoteStream = this._remoteStream$.value;
    remoteStream?.getTracks().forEach((track: MediaStreamTrack) => {
      logger.debug(`[RTCPeerConnectionController] Stopping remote track: ${track.kind}`);
      track.stop();
    });
  }

  public get mediaDirections(): {
    audio: RTCRtpTransceiverDirection;
    video: RTCRtpTransceiverDirection;
  } {
    return (
      this.transceiverController?.getMediaDirections() ??
      this._remoteOfferMediaDirections ?? {
        audio: 'inactive',
        video: 'inactive'
      }
    );
  }
  protected async _setRemoteDescription(params: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new DependencyError('RTCPeerConnection is not initialized');
    }

    const finalRemote = await this.setRemoteDescriptionBefore(params.sdp);

    const answer: RTCSessionDescriptionInit = {
      ...params,
      sdp: finalRemote
    };
    logger.debug('[RTCPeerConnectionController] Setting remote description:', answer);
    return this.peerConnection.setRemoteDescription(answer);
  }
}
