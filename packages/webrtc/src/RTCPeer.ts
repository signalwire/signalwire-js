import { EventEmitter, getLogger, uuid } from '@signalwire/core'
import {
  getUserMedia,
  getMediaConstraints,
  filterIceServers,
} from './utils/helpers'
import {
  sdpStereoHack,
  sdpBitrateHack,
  sdpMediaOrderHack,
  sdpHasValidCandidates,
  sdpHasCandidatesForEachMedia,
} from './utils/sdpHelpers'
import { BaseConnection } from './BaseConnection'
import {
  sdpToJsonHack,
  RTCPeerConnection,
  streamIsValid,
  stopTrack,
} from './utils'
import { watchRTCPeerMediaPackets } from './utils/watchRTCPeerMediaPackets'
import { connectionPoolManager } from './connectionPoolManager'
import { WebRTCStatsMonitor } from './monitoring/WebRTCStatsMonitor'
import type {
  NetworkQuality,
  StatsHistoryEntry,
  RecoveryType,
  MonitoringOptions,
  MonitoringEventHandler,
  NetworkQualityChangedEvent,
  NetworkIssueDetectedEvent,
  NetworkIssueResolvedEvent,
} from './monitoring/interfaces'
const RESUME_TIMEOUT = 12_000

export default class RTCPeer<EventTypes extends EventEmitter.ValidEventTypes> {
  public uuid = uuid()

  public instance: RTCPeerConnection

  private _iceTimeout: any
  private _negotiating = false
  private _processingRemoteSDP = false
  private _restartingIce = false
  private _watchMediaPacketsTimer: ReturnType<typeof setTimeout>
  private _connectionStateTimer: ReturnType<typeof setTimeout>
  private _resumeTimer?: ReturnType<typeof setTimeout>
  private _mediaWatcher: ReturnType<typeof watchRTCPeerMediaPackets>
  private _candidatesSnapshot: RTCIceCandidate[] = []
  private _allCandidates: RTCIceCandidate[] = []
  private _processingLocalSDP = false
  private _waitNegotiation: Promise<void> = Promise.resolve()
  private _waitNegotiationCompleter: () => void
  /**
   * Both of these properties are used to have granular
   * control over when to `resolve` and when `reject` the
   * `start()` method.
   */
  private _resolveStartMethod: (value?: unknown) => void
  private _rejectStartMethod: (error: unknown) => void

  // WebRTC Stats Monitoring properties
  private _statsMonitor?: WebRTCStatsMonitor
  private _monitoringEnabled: boolean = true

  /**
   * The promise that resolves or rejects when the negotiation succeed or fail.
   * The consumer needs to declare the promise and assign it to this in order to
   * wait for the negotiation to complete.
   */
  public _pendingNegotiationPromise?: {
    resolve: (value?: unknown) => void
    reject: (error: unknown) => void
  }

  private _localStream?: MediaStream
  private _remoteStream?: MediaStream
  private rtcConfigPolyfill: RTCConfiguration

  private get logger() {
    return getLogger()
  }

  constructor(
    public call: BaseConnection<EventTypes>,
    public type: RTCSdpType
  ) {
    this.logger.debug(
      'New Peer with type:',
      this.type,
      'Options:',
      this.options
    )

    this._onIce = this._onIce.bind(this)
    this._onEndedTrackHandler = this._onEndedTrackHandler.bind(this)

    if (this.options.prevCallId) {
      this.uuid = this.options.prevCallId
    }
    this.options.prevCallId = undefined

    if (this.options.localStream && streamIsValid(this.options.localStream)) {
      this._localStream = this.options.localStream
    }

    this.rtcConfigPolyfill = this.config

    // Initialize monitoring based on options (default: true)
    this._monitoringEnabled = this.options.enableStatsMonitoring !== false
    if (this._monitoringEnabled) {
      this._initializeStatsMonitoring()
    }
  }

  get options() {
    return this.call.options
  }

  get watchMediaPacketsTimeout() {
    return this.options.watchMediaPacketsTimeout ?? 2_000
  }

  get isNegotiating() {
    return this._negotiating
  }

  get localStream() {
    return this._localStream
  }

  set localStream(stream) {
    this._localStream = stream
  }

  get remoteStream() {
    return this._remoteStream
  }

  get isOffer() {
    return this.type === 'offer'
  }

  get isAnswer() {
    return this.type === 'answer'
  }

  get isSimulcast() {
    return this.options.simulcast === true
  }

  get isSfu() {
    return this.options.sfu === true
  }

  get localVideoTrack() {
    const videoSender = this._getSenderByKind('video')
    return videoSender?.track || null
  }

  get localAudioTrack() {
    const audioSender = this._getSenderByKind('audio')
    return audioSender?.track || null
  }

  get remoteVideoTrack() {
    const videoReceiver = this._getReceiverByKind('video')
    return videoReceiver?.track || null
  }

  get remoteAudioTrack() {
    const audioReceiver = this._getReceiverByKind('audio')
    return audioReceiver?.track || null
  }

  get hasAudioSender() {
    return this._getSenderByKind('audio') ? true : false
  }

  get hasVideoSender() {
    return this._getSenderByKind('video') ? true : false
  }

  get hasAudioReceiver() {
    return this._getReceiverByKind('audio') ? true : false
  }

  get hasVideoReceiver() {
    return this._getReceiverByKind('video') ? true : false
  }

  get config(): RTCConfiguration {
    const { rtcPeerConfig = {} } = this.options
    const config: RTCConfiguration = {
      bundlePolicy: 'max-compat',
      iceServers: filterIceServers(this.call.iceServers, {
        disableUdpIceServers: this.options.disableUdpIceServers,
      }),
      // @ts-ignore
      sdpSemantics: 'unified-plan',
      ...rtcPeerConfig,
    }
    this.logger.debug('RTC config', config)
    return config
  }

  get localSdp() {
    return this.instance?.localDescription?.sdp
  }

  get remoteSdp() {
    return this.instance?.remoteDescription?.sdp
  }

  get hasIceServers() {
    if (this.instance) {
      const { iceServers = [] } = this.getConfiguration()
      return Boolean(iceServers?.length)
    }
    return false
  }

  private _negotiationCompleted(error?: unknown) {
    if (!error) {
      this._resolveStartMethod()
      this._waitNegotiationCompleter?.()
      this._pendingNegotiationPromise?.resolve()
    } else {
      this._rejectStartMethod(error)
      this._waitNegotiationCompleter?.()
      this._pendingNegotiationPromise?.reject(error)
    }
  }

  stopTrackSender(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender) {
        return this.logger.info(`There is not a '${kind}' sender to stop.`)
      }
      if (sender.track) {
        stopTrack(sender.track)
        this._localStream?.removeTrack(sender.track)
      }
    } catch (error) {
      this.logger.error('RTCPeer stopTrackSender error', kind, error)
    }
  }

  stopTrackReceiver(kind: string) {
    try {
      const receiver = this._getReceiverByKind(kind)
      if (!receiver) {
        return this.logger.info(`There is not a '${kind}' receiver to stop.`)
      }
      if (receiver.track) {
        stopTrack(receiver.track)
        this._remoteStream?.removeTrack(receiver.track)
      }
    } catch (error) {
      this.logger.error('RTCPeer stopTrackReceiver error', kind, error)
    }
  }

  async restoreTrackSender(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender) {
        return this.logger.info(`There is not a '${kind}' sender to restore.`)
      }
      if (sender.track && sender.track.readyState !== 'ended') {
        return this.logger.info(`There is already an active ${kind} track.`)
      }
      const constraints = await getMediaConstraints(this.options)
      // @ts-ignore
      const stream = await getUserMedia({ [kind]: constraints[kind] })
      if (stream && streamIsValid(stream)) {
        const newTrack = stream.getTracks().find((t) => t.kind === kind)
        if (newTrack) {
          await sender.replaceTrack(newTrack)
          this._localStream?.addTrack(newTrack)
        }
      }
    } catch (error) {
      this.logger.error('RTCPeer restoreTrackSender error', kind, error)
    }
  }

  getDeviceId(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return null
      }
      const { deviceId = null } = sender.track.getSettings()
      return deviceId
    } catch (error) {
      this.logger.error('RTCPeer getDeviceId error', kind, error)
      return null
    }
  }

  getTrackSettings(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return null
      }
      return sender.track.getSettings()
    } catch (error) {
      this.logger.error('RTCPeer getTrackSettings error', kind, error)
      return null
    }
  }

  getTrackConstraints(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return null
      }
      return sender.track.getConstraints()
    } catch (error) {
      this.logger.error('RTCPeer getTrackConstraints error', kind, error)
      return null
    }
  }

  getDeviceLabel(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return null
      }
      return sender.track.label
    } catch (error) {
      this.logger.error('RTCPeer getDeviceLabel error', kind, error)
      return null
    }
  }

  restartIceWithRelayOnly() {
    try {
      if (this.isAnswer) {
        return this.logger.warn(
          'Skip restartIceWithRelayOnly since we need to generate answer'
        )
      }

      const config = this.getConfiguration()
      if (config.iceTransportPolicy === 'relay') {
        return this.logger.warn(
          'RTCPeer already with iceTransportPolicy relay only'
        )
      }
      const newConfig: RTCConfiguration = {
        ...config,
        iceTransportPolicy: 'relay',
      }
      this.setConfiguration(newConfig)
      this.restartIce()
    } catch (error) {
      this.logger.error('restartIceWithRelayOnly', error)
      this._negotiationCompleted(error)
    }
  }

  restartIce() {
    if (this._negotiating || this._restartingIce) {
      return this.logger.warn('Skip restartIce')
    }
    this._restartingIce = true

    this.logger.debug('Restart ICE')
    // Type must be Offer to send reinvite.
    this.type = 'offer'
    this.instance.restartIce()
  }

  triggerResume() {
    this.logger.info('Probably half-open so force close from client')
    if (this._resumeTimer) {
      this.logger.info('[skipped] Already in "resume" state')
      return
    }
    this.call.emit('media.disconnected')

    this.call.emit('media.reconnecting')
    this.clearTimers()
    this._resumeTimer = setTimeout(() => {
      this.logger.warn('Disconnecting due to RECONNECTION_ATTEMPT_TIMEOUT')
      this.call.emit('media.disconnected')
      this.call.leaveReason = 'RECONNECTION_ATTEMPT_TIMEOUT'
      this.call.setState('hangup')
    }, RESUME_TIMEOUT) // TODO: read from call verto.invite response
    this.call._closeWSConnection()
  }

  private resetNeedResume() {
    this.clearResumeTimer()
    if (this.options.watchMediaPackets) {
      this.startWatchMediaPackets()
    }
  }

  stopWatchMediaPackets() {
    if (this._mediaWatcher) {
      this._mediaWatcher.stop()
    }
  }

  startWatchMediaPackets() {
    this.stopWatchMediaPackets()
    this._mediaWatcher = watchRTCPeerMediaPackets(this)
    this._mediaWatcher?.start()
  }

  async applyMediaConstraints(
    kind: string,
    constraints: MediaTrackConstraints
  ) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return this.logger.info(
          'No sender to apply constraints',
          kind,
          constraints
        )
      }
      if (sender.track.readyState === 'live') {
        const newConstraints: MediaTrackConstraints = {
          ...sender.track.getConstraints(),
          ...constraints,
        }
        const deviceId = this.getDeviceId(kind)
        if (deviceId && !this.options.screenShare) {
          newConstraints.deviceId = { exact: deviceId }
        }
        this.logger.info(
          `Apply ${kind} constraints`,
          this.call.id,
          newConstraints
        )
        // Should we check if the current track is capable enough to support the incoming constraints?
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getCapabilities
        await sender.track.applyConstraints(newConstraints)
      }
    } catch (error) {
      this.logger.error('Error applying constraints', kind, constraints)
    }
  }

  private _getSenderByKind(kind: string) {
    if (!this.instance?.getSenders) {
      this.logger.warn('RTCPeerConnection.getSenders() not available.')
      return null
    }
    return this.instance
      .getSenders()
      .find(({ track }) => track && track.kind === kind)
  }

  private _getReceiverByKind(kind: string) {
    if (!this.instance?.getReceivers) {
      this.logger.warn('RTCPeerConnection.getReceivers() not available.')
      return null
    }
    return this.instance
      .getReceivers()
      .find(({ track }) => track && track.kind === kind)
  }

  async startNegotiation(force = false) {
    if (this._negotiating) {
      return this.logger.warn('Skip twice onnegotiationneeded!')
    }
    this._negotiating = true
    try {
      /**
       * additionalDevice and screenShare are `sendonly`
       */
      if (this.options.additionalDevice || this.options.screenShare) {
        this.instance?.getTransceivers?.().forEach((tr) => {
          tr.direction = 'sendonly'
        })
      }

      this.instance.removeEventListener('icecandidate', this._onIce)
      this.instance.addEventListener('icecandidate', this._onIce)
      if (this.isOffer) {
        this.logger.debug('Trying to generate offer')
        const offerOptions: RTCOfferOptions = {
          /**
           * While this property is deprected, on Browsers where this
           * is still supported this avoids conflicting with the VAD
           * server-side
           */
          // @ts-ignore
          voiceActivityDetection: false,
        }
        if (!this._supportsAddTransceiver()) {
          offerOptions.offerToReceiveAudio = this.options.negotiateAudio
          offerOptions.offerToReceiveVideo = this.options.negotiateVideo
        }
        const offer = await this.instance.createOffer(offerOptions)
        await this._setLocalDescription(offer)
      }
      if (this.isAnswer) {
        this.logger.debug('Trying to generate answer')
        await this._setRemoteDescription({
          sdp: this.options.remoteSdp,
          type: 'offer',
        })
        const answer = await this.instance.createAnswer({
          // Same as above.
          // @ts-ignore
          voiceActivityDetection: false,
        })
        await this._setLocalDescription(answer)
      }

      /**
       * ReactNative and Early invite Workaround
       */
      if (force && this.instance.signalingState === 'have-local-offer') {
        this._sdpReady()
      }

      this.logger.info('iceGatheringState', this.instance.iceGatheringState)
      if (this.instance.iceGatheringState === 'gathering') {
        this._iceTimeout = setTimeout(() => {
          this._onIceTimeout()
        }, this.options.maxIceGatheringTimeout)
      }
    } catch (error) {
      this.logger.error(`Error creating ${this.type}:`, error)
      this._negotiationCompleted(error)
    }
  }

  onRemoteBye({ code, message }: { code: string; message: string }) {
    // It could be a negotiation/signaling error so reject the "startMethod"
    const error = { code, message }
    this._negotiationCompleted(error)
    this.stop()
  }

  async onRemoteSdp(sdp: string) {
    if (
      this._processingRemoteSDP ||
      (this.remoteSdp && this.remoteSdp === sdp)
    ) {
      this.logger.warn('Ignore same remote SDP', sdp)
      return
    }

    try {
      const type = this.isOffer ? 'answer' : 'offer'
      if (
        type === 'answer' &&
        this.instance.signalingState !== 'have-local-offer'
      ) {
        this.logger.warn(
          'Ignoring offer SDP as signaling state is not have-local-offer'
        )
        return
      }
      this._processingRemoteSDP = true
      await this._setRemoteDescription({ sdp, type })
      this._processingRemoteSDP = false

      /**
       * Resolve the start() method only for Offer because for Answer
       * we need to reply to the server and wait for the signaling.
       */
      if (this.isOffer) {
        this._negotiationCompleted()
      }

      this.resetNeedResume()
    } catch (error) {
      this._processingRemoteSDP = false
      this.logger.error(
        `Error handling remote SDP on call ${this.call.id}:`,
        error
      )
      this.call.hangup()
      this._negotiationCompleted(error)
    }
  }

  private _setupRTCPeerConnection() {
    if (!this.instance) {
      // Try to get a pre-warmed connection from session-level pool
      let pooledConnection: RTCPeerConnection | null = null

      try {
        pooledConnection = connectionPoolManager.getConnection()
      } catch (error) {
        this.logger.debug('Could not access session connection pool', error)
      }

      if (pooledConnection) {
        this.logger.info(
          'Using pre-warmed connection from session pool with ICE candidates ready'
        )
        this.instance = pooledConnection

        // The connection is already clean:
        // - Mock tracks have been stopped and removed
        // - ICE candidates are gathered and ready
        // - TURN allocation is fresh
        // - All event listeners have been removed
      } else {
        // Fallback to creating new connection
        this.logger.debug(
          'Creating new RTCPeerConnection (no pooled connection available)'
        )
        this.instance = RTCPeerConnection(this.config)
      }

      this._attachListeners()
      
      // Initialize stats monitoring now that we have a peer connection
      if (this._monitoringEnabled && !this._statsMonitor) {
        this._initializeStatsMonitoringWithPeerConnection()
      }
    }
  }

  /**
   * Initialize stats monitoring with the peer connection instance
   * @private
   */
  private _initializeStatsMonitoringWithPeerConnection(): void {
    if (!this._monitoringEnabled || this._statsMonitor || !this.instance) {
      return
    }

    try {
      // Create a wrapper object that provides the expected interface
      const rtcPeerWrapper = {
        peerConnection: this.instance,
        uuid: this.uuid,
        logger: this.logger,
      }
      
      this._statsMonitor = new WebRTCStatsMonitor(rtcPeerWrapper as any, this.call)
      this._setupMonitoringEventHandlers()
      this.logger.debug('WebRTC Stats Monitoring initialized with peer connection')
    } catch (error) {
      this.logger.error('Failed to initialize WebRTC Stats Monitoring with peer connection', error)
      this._monitoringEnabled = false
    }
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      this._resolveStartMethod = resolve
      this._rejectStartMethod = reject

      try {
        this._localStream = await this._retrieveLocalStream()
      } catch (error) {
        this._negotiationCompleted(error)
        return this.call.setState('hangup')
      }

      /**
       * We need to defer the creation of RTCPeerConnection
       * until we gain gUM access otherwise it will have
       * private IP addresses in ICE host candidates
       * replaced by an mDNS hostname
       * @see https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU?pli=1
       */
      this._setupRTCPeerConnection()

      let hasLocalTracks = false
      if (this._localStream && streamIsValid(this._localStream)) {
        const audioTracks = this._localStream.getAudioTracks()

        this.logger.debug('Local audio tracks: ', audioTracks)
        const videoTracks = this._localStream.getVideoTracks()

        this.logger.debug('Local video tracks: ', videoTracks)
        hasLocalTracks = Boolean(audioTracks.length || videoTracks.length)

        // TODO: use transceivers way only for offer - when answer gotta match mid from the ones from SRD
        if (this.isOffer && this._supportsAddTransceiver()) {
          const audioTransceiverParams: RTCRtpTransceiverInit = {
            direction: this.options.negotiateAudio ? 'sendrecv' : 'sendonly',
            streams: [this._localStream],
          }
          this.logger.debug(
            'Applying audioTransceiverParams',
            audioTransceiverParams
          )

          // Reuse existing audio transceivers from pooled connections
          const existingAudioTransceivers = this.instance
            .getTransceivers()
            .filter(
              (t) =>
                t.receiver.track?.kind === 'audio' ||
                (!t.sender.track &&
                  !t.receiver.track &&
                  t.mid?.includes('audio'))
            )

          audioTracks.forEach((track, index) => {
            if (index < existingAudioTransceivers.length) {
              // Reuse existing transceiver
              const transceiver = existingAudioTransceivers[index]
              this.logger.debug(
                'Reusing existing audio transceiver',
                transceiver.mid
              )
              transceiver.sender.replaceTrack(track)
              transceiver.direction =
                audioTransceiverParams.direction || 'sendrecv'
              // Add stream association
              if (audioTransceiverParams.streams?.[0]) {
                // @ts-ignore - streams is a valid property but not in TS types
                transceiver.sender.streams = audioTransceiverParams.streams
              }
            } else {
              // Create new transceiver only if needed
              this.logger.debug('Creating new audio transceiver')
              this.instance.addTransceiver(track, audioTransceiverParams)
            }
          })

          const videoTransceiverParams: RTCRtpTransceiverInit = {
            direction: this.options.negotiateVideo ? 'sendrecv' : 'sendonly',
            streams: [this._localStream],
          }
          if (this.isSimulcast) {
            const rids = ['0', '1', '2']
            videoTransceiverParams.sendEncodings = rids.map((rid) => ({
              active: true,
              rid: rid,
              scaleResolutionDownBy: Number(rid) * 6 || 1.0,
            }))
          }
          this.logger.debug(
            'Applying videoTransceiverParams',
            videoTransceiverParams
          )

          // Reuse existing video transceivers from pooled connections
          const existingVideoTransceivers = this.instance
            .getTransceivers()
            .filter(
              (t) =>
                t.receiver.track?.kind === 'video' ||
                (!t.sender.track &&
                  !t.receiver.track &&
                  t.mid?.includes('video'))
            )

          videoTracks.forEach((track, index) => {
            if (index < existingVideoTransceivers.length) {
              // Reuse existing transceiver
              const transceiver = existingVideoTransceivers[index]
              this.logger.debug(
                'Reusing existing video transceiver',
                transceiver.mid
              )
              transceiver.sender.replaceTrack(track)
              transceiver.direction =
                videoTransceiverParams.direction || 'sendrecv'
              // Add stream association
              if (videoTransceiverParams.streams?.[0]) {
                // @ts-ignore - streams is a valid property but not in TS types
                transceiver.sender.streams = videoTransceiverParams.streams
              }
              // Apply simulcast encodings if needed
              if (videoTransceiverParams.sendEncodings) {
                const params = transceiver.sender.getParameters()
                params.encodings = videoTransceiverParams.sendEncodings
                transceiver.sender.setParameters(params)
              }
            } else {
              // Create new transceiver only if needed
              this.logger.debug('Creating new video transceiver')
              this.instance.addTransceiver(track, videoTransceiverParams)
            }
          })

          if (this.isSfu) {
            const { msStreamsNumber = 5 } = this.options
            this.logger.debug('Add ', msStreamsNumber, 'recvonly MS Streams')
            videoTransceiverParams.direction = 'recvonly'
            for (let i = 0; i < Number(msStreamsNumber); i++) {
              this.instance.addTransceiver('video', videoTransceiverParams)
            }
          }
        } else if (typeof this.instance.addTrack === 'function') {
          // Use addTrack
          // To avoid TS complains in forEach
          const stream = this._localStream
          audioTracks.forEach((track) => this.instance.addTrack(track, stream))
          videoTracks.forEach((track) => this.instance.addTrack(track, stream))
        } else {
          // Fallback to legacy addStream ..
          // @ts-ignore
          this.instance.addStream(this._localStream)
        }
      }

      if (this.isOffer) {
        // Handle unused transceivers from pooled connections
        if (this.instance.signalingState === 'have-local-offer') {
          // We're reusing a pooled connection
          this.logger.debug('Reusing pooled connection, managing transceivers')

          // Get local tracks to determine what transceivers we need
          const localAudioTracks = this._localStream?.getAudioTracks() || []
          const localVideoTracks = this._localStream?.getVideoTracks() || []

          // Set unused transceivers to inactive
          const transceivers = this.instance.getTransceivers()
          transceivers.forEach((transceiver) => {
            const isAudioTransceiver =
              transceiver.receiver.track?.kind === 'audio' ||
              (!transceiver.sender.track &&
                !transceiver.receiver.track &&
                transceiver.mid?.includes('audio'))
            const isVideoTransceiver =
              transceiver.receiver.track?.kind === 'video' ||
              (!transceiver.sender.track &&
                !transceiver.receiver.track &&
                transceiver.mid?.includes('video'))

            // If we don't have audio tracks and this is an audio transceiver, set to inactive
            if (isAudioTransceiver && localAudioTracks.length === 0) {
              this.logger.debug(
                'Setting unused audio transceiver to inactive',
                transceiver.mid
              )
              transceiver.direction = 'inactive'
            }

            // If we don't have video tracks and this is a video transceiver, set to inactive
            if (isVideoTransceiver && localVideoTracks.length === 0) {
              this.logger.debug(
                'Setting unused video transceiver to inactive',
                transceiver.mid
              )
              transceiver.direction = 'inactive'
            }
          })
        }

        if (this.options.negotiateAudio) {
          this._checkMediaToNegotiate('audio')
        }
        if (this.options.negotiateVideo) {
          this._checkMediaToNegotiate('video')
        }

        if (this.instance.signalingState === 'have-local-offer') {
          // we are reusing a pooled connection
          this.logger.debug('Reusing pooled connection with local offer')
          this.startNegotiation(true)
        }

        /**
         * If it does not support unified-plan stuff (senders/receivers/transceivers)
         * invoke manually startNegotiation and use the RTCOfferOptions
         */
        if (!this._supportsAddTransceiver() && !hasLocalTracks) {
          this.startNegotiation()
        }
      } else {
        this.startNegotiation()
      }
    })
  }

  detachAndStop() {
    if (typeof this.instance?.getTransceivers === 'function') {
      this.instance.getTransceivers().forEach((transceiver) => {
        // Do not use `stopTrack` util to not dispatch the `ended` event
        if (transceiver.sender.track) {
          transceiver.sender.track.stop()
        }
        if (transceiver.receiver.track) {
          transceiver.receiver.track.stop()
        }
      })
    }

    this.stop()
  }

  stop() {
    // Stop stats monitoring before cleanup
    if (this._statsMonitor) {
      this.stopStatsMonitoring()
    }

    // Do not use `stopTrack` util to not dispatch the `ended` event
    this._localStream?.getTracks().forEach((track) => track.stop())
    this._remoteStream?.getTracks().forEach((track) => track.stop())

    this.instance?.close()

    this.stopWatchMediaPackets()
    
    // Dispose of monitoring resources
    if (this._statsMonitor) {
      this._statsMonitor.dispose()
      this._statsMonitor = undefined
    }
  }

  private _supportsAddTransceiver() {
    return typeof this.instance.addTransceiver === 'function'
  }

  private _checkMediaToNegotiate(kind: string) {
    // addTransceiver of 'kind' if not present
    const sender = this._getSenderByKind(kind)
    if (!sender && this._supportsAddTransceiver()) {
      // Check if we already have a transceiver for this kind (from pooled connection)
      const existingTransceiver = this.instance
        .getTransceivers()
        .find(
          (t) =>
            t.receiver.track?.kind === kind ||
            (!t.sender.track && !t.receiver.track && t.mid?.includes(kind))
        )

      if (existingTransceiver) {
        this.logger.debug(
          'Found existing transceiver for',
          kind,
          existingTransceiver.mid
        )
        // Update direction if needed
        if (
          existingTransceiver.direction === 'inactive' ||
          existingTransceiver.direction === 'sendonly'
        ) {
          existingTransceiver.direction = 'recvonly'
        }
      } else {
        const transceiver = this.instance.addTransceiver(kind, {
          direction: 'recvonly',
        })
        this.logger.debug('Add transceiver', kind, transceiver)
      }
    }
  }

  private async _sdpReady() {
    if (this._processingLocalSDP) {
      this.logger.debug('Already processing local SDP, skipping')
      return
    }

    this._processingLocalSDP = true
    clearTimeout(this._iceTimeout)

    if (!this.instance.localDescription) {
      this.logger.error('Missing localDescription', this.instance)
      return
    }
    const { sdp } = this.instance.localDescription
    if (!sdpHasCandidatesForEachMedia(sdp)) {
      this.logger.info('No candidate - retry \n')
      this._processingLocalSDP = false
      this.startNegotiation(true)
      return
    }

    if (!this._sdpIsValid()) {
      this.logger.info('SDP ready but not valid')
      this._processingLocalSDP = false
      this._onIceTimeout()
      return
    }

    try {
      const skipOnLocalSDPReady = !(await this._isAllowedToSendLocalSDP())
      if (skipOnLocalSDPReady) {
        this.logger.info('Skipping onLocalSDPReady due to early invite')
        this._processingLocalSDP = false
        return
      }

      this._waitNegotiation = new Promise((resolve) => {
        this._waitNegotiationCompleter = resolve
      })

      await this.call.onLocalSDPReady(this)
      this._processingLocalSDP = false
      if (this.isAnswer) {
        this._negotiationCompleted()
      }
    } catch (error) {
      this._negotiationCompleted(error)
      this._processingLocalSDP = false
    }
  }

  /**
   * Waits for the pending negotiation promise to resolve
   * and checks if the current signaling state allows to send a local SDP.
   * This is used to prevent sending an offer when the signaling state is not appropriate.
   * or when still waiting for a previous negotiation to complete.
   */
  private async _isAllowedToSendLocalSDP() {
    console.dir(`####### _isAllowedToSendLocalSDP`, this._waitNegotiation)
    console.log(
      `####### this.instance.signalingState ${this.instance.signalingState}`
    )
    await this._waitNegotiation

    // Check if signalingState have the right state to sand an offer
    return (
      (this.type === 'offer' &&
        ['have-local-offer', 'have-local-pranswer'].includes(
          this.instance.signalingState
        )) ||
      (this.type === 'answer' && this.instance.signalingState === 'stable')
    )
  }

  private _sdpIsValid() {
    if (this.localSdp && this.hasIceServers) {
      return sdpHasValidCandidates(this.localSdp)
    }

    return Boolean(this.localSdp)
  }

  private _forceNegotiation() {
    this.logger.info('Force negotiation again')
    this._negotiating = false
    this.startNegotiation()
  }

  private _onIceTimeout() {
    if (this._sdpIsValid()) {
      this._sdpReady()
      return
    }
    this.logger.info('ICE gathering timeout')
    const config = this.getConfiguration()
    if (config.iceTransportPolicy === 'relay') {
      this.logger.info('RTCPeer already with "iceTransportPolicy: relay"')
      const error = {
        code: 'ICE_GATHERING_FAILED',
        message: 'Ice gathering timeout',
      }
      this._negotiationCompleted(error)
      this.call.setState('destroy')
      return
    }
    this.setConfiguration({
      ...config,
      iceTransportPolicy: 'relay',
    })

    this._forceNegotiation()
  }

  private _onIce(event: RTCPeerConnectionIceEvent) {
    /**
     * Clear _iceTimeout on each single candidate
     */
    if (this._iceTimeout) {
      clearTimeout(this._iceTimeout)
    }

    /**
     * Following spec: no candidate means the gathering is completed.
     */
    if (!event.candidate) {
      this.instance.removeEventListener('icecandidate', this._onIce)
      // not call _sdpReady if an early invite has been sent
      if (this._candidatesSnapshot.length > 0) {
        this.logger.debug('No more candidates, calling _sdpReady')
        this._sdpReady()
      }
      return
    }

    // Store all candidates
    this._allCandidates.push(event.candidate)

    this.logger.debug('RTCPeer Candidate:', event.candidate)
    if (event.candidate.type === 'host') {
      /**
       * With `host` candidate set timeout to
       * maxIceGatheringTimeout and then invoke
       * _onIceTimeout to check if the SDP is valid
       */
      this._iceTimeout = setTimeout(() => {
        this.instance.removeEventListener('icecandidate', this._onIce)
        this._onIceTimeout()
      }, this.options.maxIceGatheringTimeout)
    } else {
      /**
       * With non-HOST candidate (srflx, prflx or relay), check if we have
       * candidates for all media sections to support early invite
       */
      if (this.instance.localDescription?.sdp) {
        if (sdpHasValidCandidates(this.instance.localDescription.sdp)) {
          // Take a snapshot of candidates at this point
          if (this._candidatesSnapshot.length === 0 && this.type === 'offer') {
            this._candidatesSnapshot = [...this._allCandidates]
            this.logger.info(
              'SDP has candidates for all media sections, calling _sdpReady for early invite'
            )
            setTimeout(() => this._sdpReady(), 0) // Defer to allow any pending operations to complete
          }
        } else {
          this.logger.info(
            'SDP does not have candidates for all media sections, waiting for more candidates'
          )
          this.logger.debug(this.instance.localDescription?.sdp)
        }
      }
    }
  }

  private _retryWithMoreCandidates() {
    // Check if we have better candidates now than when we first sent SDP
    const hasMoreCandidates = this._hasMoreCandidates()

    if (hasMoreCandidates && this.instance.connectionState !== 'connected') {
      this.logger.info(
        'More candidates found after ICE gathering complete, triggering renegotiation'
      )
      // Reset negotiation state to allow new negotiation
      this._negotiating = false
      this._candidatesSnapshot = []
      this._allCandidates = []

      // set the SDP type to 'offer' since the client is initiating a new negotiation
      this.type = 'offer'
      // Start negotiation with force=true
      if (this.instance.signalingState === 'stable') {
        this.startNegotiation(true)
      } else {
        this.logger.warn(
          'Signaling state is not stable, cannot start negotiation immediately'
        )
        this.restartIce()
      }
    }
  }

  private _hasMoreCandidates(): boolean {
    return this._allCandidates.length > this._candidatesSnapshot.length
  }

  private _setLocalDescription(localDescription: RTCSessionDescriptionInit) {
    const {
      useStereo,
      googleMaxBitrate,
      googleMinBitrate,
      googleStartBitrate,
    } = this.options
    if (localDescription.sdp && useStereo) {
      localDescription.sdp = sdpStereoHack(localDescription.sdp)
    }
    if (
      localDescription.sdp &&
      googleMaxBitrate &&
      googleMinBitrate &&
      googleStartBitrate
    ) {
      localDescription.sdp = sdpBitrateHack(
        localDescription.sdp,
        googleMaxBitrate,
        googleMinBitrate,
        googleStartBitrate
      )
    }
    // this.logger.debug(
    //   'LOCAL SDP \n',
    //   `Type: ${localDescription.type}`,
    //   '\n\n',
    //   localDescription.sdp
    // )
    return this.instance.setLocalDescription(localDescription)
  }

  private _setRemoteDescription(remoteDescription: RTCSessionDescriptionInit) {
    if (remoteDescription.sdp && this.options.useStereo) {
      remoteDescription.sdp = sdpStereoHack(remoteDescription.sdp)
    }
    if (remoteDescription.sdp && this.instance.localDescription) {
      remoteDescription.sdp = sdpMediaOrderHack(
        remoteDescription.sdp,
        this.instance.localDescription.sdp
      )
    }
    const sessionDescr: RTCSessionDescription = sdpToJsonHack(remoteDescription)
    this.logger.debug(
      'REMOTE SDP \n',
      `Type: ${remoteDescription.type}`,
      '\n\n',
      remoteDescription.sdp
    )

    return this.instance.setRemoteDescription(sessionDescr)
  }

  private async _retrieveLocalStream() {
    if (streamIsValid(this.options.localStream)) {
      return this.options.localStream
    }
    const constraints = await getMediaConstraints(this.options)
    return getUserMedia(constraints)
  }

  private _attachListeners() {
    this.instance.addEventListener('signalingstatechange', () => {
      this.logger.debug('signalingState:', this.instance.signalingState)

      switch (this.instance.signalingState) {
        case 'stable':
          // Workaround to skip nested negotiations
          // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
          this._negotiating = false
          this._restartingIce = false
          this.resetNeedResume()

          if (this.instance.connectionState === 'connected') {
            // An ice restart won't change the connectionState so we emit the same event in here
            // since the signalingState is "stable" again.
            this.emitMediaConnected()
          }
          break
        case 'have-local-offer': {
          if (this.instance.iceGatheringState === 'complete') {
            this.instance.removeEventListener('icecandidate', this._onIce)
            this._sdpReady()
          }
          break
        }
        // case 'have-remote-offer': {}
        case 'closed':
          // @ts-ignore
          delete this.instance
          break
        default:
          this._negotiating = true
      }
    })

    this.instance.addEventListener('connectionstatechange', () => {
      this.logger.debug('connectionState:', this.instance.connectionState)
      switch (this.instance.connectionState) {
        // case 'new':
        //   break
        case 'connecting':
          this._connectionStateTimer = setTimeout(() => {
            this.logger.warn('connectionState timed out')
            if (this._hasMoreCandidates()) {
              this._retryWithMoreCandidates()
            } else {
              this.restartIceWithRelayOnly()
            }
          }, this.options.maxConnectionStateTimeout)
          break
        case 'connected':
          this.clearConnectionStateTimer()
          this.emitMediaConnected()
          
          // Start stats monitoring 2 seconds after connection is established
          if (this._monitoringEnabled && this._statsMonitor) {
            setTimeout(() => {
              if (this.instance?.connectionState === 'connected') {
                this.startStatsMonitoring()
              }
            }, 2000)
          }
          break
        // case 'closed':
        //   break
        case 'disconnected':
          this.logger.debug('[test] Prevent reattach!')
          break
        case 'failed': {
          this.triggerResume()
          break
        }
      }
    })

    this.instance.addEventListener('negotiationneeded', () => {
      this.logger.debug('Negotiation needed event')
      this.startNegotiation()
    })

    this.instance.addEventListener('iceconnectionstatechange', () => {
      this.logger.debug('iceConnectionState:', this.instance.iceConnectionState)
    })

    this.instance.addEventListener('icegatheringstatechange', () => {
      this.logger.debug('iceGatheringState:', this.instance.iceGatheringState)
      if (this.instance.iceGatheringState === 'complete') {
        this.logger.debug('ICE gathering complete')
        void this._sdpReady()
      }
    })

    // this.instance.addEventListener('icecandidateerror', (event) => {
    //   this.logger.warn('IceCandidate Error:', event)
    // })

    this.instance.addEventListener('track', (event: RTCTrackEvent) => {
      // @ts-expect-error
      this.call.emit('track', event)

      if (this.isSfu) {
        // const notification = { type: 'trackAdd', event }
        // this.call._dispatchNotification(notification)
      }
      this._remoteStream = event.streams[0]
    })

    // @ts-ignore
    this.instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      if (event.stream) {
        this._remoteStream = event.stream
      }
    })

    this._attachAudioTrackListener()
    this._attachVideoTrackListener()
  }

  private clearTimers() {
    this.clearResumeTimer()
    this.clearWatchMediaPacketsTimer()
    this.clearConnectionStateTimer()
  }

  private clearConnectionStateTimer() {
    clearTimeout(this._connectionStateTimer)
  }

  private clearWatchMediaPacketsTimer() {
    clearTimeout(this._watchMediaPacketsTimer)
  }

  private clearResumeTimer() {
    clearTimeout(this._resumeTimer)
    this._resumeTimer = undefined
  }

  private emitMediaConnected() {
    this.call.emit('media.connected')
  }

  private _onEndedTrackHandler(event: Event) {
    const mediaTrack = event.target as MediaStreamTrack
    const evt = mediaTrack.kind === 'audio' ? 'microphone' : 'camera'
    this.call.emit(`${evt}.disconnected`, {
      deviceId: mediaTrack.id,
      label: mediaTrack.label,
    })
  }

  public _attachAudioTrackListener() {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', this._onEndedTrackHandler)
    })
  }

  public _attachVideoTrackListener() {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', this._onEndedTrackHandler)
    })
  }

  public _detachAudioTrackListener() {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.removeEventListener('ended', this._onEndedTrackHandler)
    })
  }

  public _detachVideoTrackListener() {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.removeEventListener('ended', this._onEndedTrackHandler)
    })
  }

  /**
   * React Native does not support getConfiguration
   * so we polyfill it using a local `rtcConfigPolyfill` object.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setConfiguration#parameters
   */
  private setConfiguration(config: RTCConfiguration) {
    this.rtcConfigPolyfill = config
    if (
      this.instance &&
      typeof this.instance?.setConfiguration === 'function'
    ) {
      this.instance.setConfiguration(config)
    }
  }

  /**
   * React Native does not support getConfiguration
   * so we polyfill it using a local config object.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getConfiguration
   */
  private getConfiguration() {
    if (
      this.instance &&
      typeof this.instance?.getConfiguration === 'function'
    ) {
      return this.instance.getConfiguration()
    }
    return this.rtcConfigPolyfill || this.config
  }

  // === WebRTC Stats Monitoring Methods ===

  /**
   * Initialize the stats monitoring system
   * @private
   */
  private _initializeStatsMonitoring(): void {
    if (!this._monitoringEnabled || this._statsMonitor) {
      return
    }

    try {
      // Note: We need to defer initialization until the peer connection is created
      // This will be done in _setupRTCPeerConnection()
      this.logger.debug('WebRTC Stats Monitoring initialization deferred until peer connection is ready')
    } catch (error) {
      this.logger.error('Failed to prepare WebRTC Stats Monitoring initialization', error)
      this._monitoringEnabled = false
    }
  }

  /**
   * Setup event handlers for monitoring events
   * @private
   */
  private _setupMonitoringEventHandlers(): void {
    if (!this._statsMonitor) return

    // Handle network quality changes
    const onQualityChanged: MonitoringEventHandler<NetworkQualityChangedEvent> = (event) => {
      this.call.emit('network.quality.changed', {
        quality: event.quality,
        previousQuality: event.previousQuality,
        timestamp: event.timestamp,
      })
    }

    // Handle network issues detected
    const onIssueDetected: MonitoringEventHandler<NetworkIssueDetectedEvent> = (event) => {
      this.call.emit('network.issue.detected', {
        issue: event.issue,
        quality: event.quality,
        timestamp: event.timestamp,
      })
    }

    // Handle network issues resolved
    const onIssueResolved: MonitoringEventHandler<NetworkIssueResolvedEvent> = (event) => {
      this.call.emit('network.issue.resolved', {
        issue: event.issue,
        duration: event.duration,
        quality: event.quality,
        timestamp: event.timestamp,
      })
    }

    this._statsMonitor.on('network.quality.changed', onQualityChanged)
    this._statsMonitor.on('network.issue.detected', onIssueDetected)
    this._statsMonitor.on('network.issue.resolved', onIssueResolved)
  }

  /**
   * Start WebRTC stats monitoring
   * @param options Optional monitoring configuration
   */
  startStatsMonitoring(options?: MonitoringOptions): void {
    if (!this._monitoringEnabled || !this._statsMonitor) {
      this.logger.warn('Stats monitoring is not enabled or not initialized')
      return
    }

    try {
      this._statsMonitor.start(options)
      this.logger.debug('WebRTC Stats Monitoring started')
    } catch (error) {
      this.logger.error('Failed to start WebRTC Stats Monitoring', error)
    }
  }

  /**
   * Stop WebRTC stats monitoring
   */
  stopStatsMonitoring(): void {
    if (!this._statsMonitor) {
      return
    }

    try {
      this._statsMonitor.stop()
      this.logger.debug('WebRTC Stats Monitoring stopped')
    } catch (error) {
      this.logger.error('Failed to stop WebRTC Stats Monitoring', error)
    }
  }

  /**
   * Check if WebRTC stats monitoring is enabled and active
   * @returns True if monitoring is enabled and active
   */
  isStatsMonitoringEnabled(): boolean {
    return this._monitoringEnabled && this._statsMonitor?.getState().isActive === true
  }

  /**
   * Get current network quality information
   * @returns Current network quality or null if monitoring is not active
   */
  getNetworkQuality(): NetworkQuality | null {
    if (!this._statsMonitor || !this.isStatsMonitoringEnabled()) {
      return null
    }

    try {
      return this._statsMonitor.getNetworkQuality()
    } catch (error) {
      this.logger.error('Failed to get network quality', error)
      return null
    }
  }

  /**
   * Get WebRTC stats history
   * @param limit Optional limit on number of entries to return
   * @returns Array of stats history entries or empty array if monitoring is not active
   */
  getStatsHistory(limit?: number): StatsHistoryEntry[] {
    if (!this._statsMonitor || !this.isStatsMonitoringEnabled()) {
      return []
    }

    try {
      return this._statsMonitor.getMetricsHistory(limit)
    } catch (error) {
      this.logger.error('Failed to get stats history', error)
      return []
    }
  }

  /**
   * Request a keyframe from remote peer (recovery action)
   * This can help with video quality issues by forcing a fresh video frame
   */
  async requestKeyframe(): Promise<void> {
    if (!this.instance) {
      this.logger.error('Cannot request keyframe: RTCPeerConnection instance not available')
      throw new Error('RTCPeerConnection instance not available')
    }

    try {
      const videoSender = this._getSenderByKind('video')
      if (!videoSender || !videoSender.track) {
        this.logger.warn('No video sender available for keyframe request - no video track to refresh')
        return
      }

      this.logger.info('Requesting keyframe for video quality recovery')

      // Method 1: Use RTP stats to identify video streams and check PLI capability
      const stats = await this.instance.getStats()
      let foundOutboundVideo = false
      
      stats.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          foundOutboundVideo = true
          this.logger.debug(`Found outbound video RTP stream (SSRC: ${report.ssrc}), PLI capability available`)
        }
      })

      if (!foundOutboundVideo) {
        this.logger.warn('No outbound video RTP stream found in stats')
      }

      // Method 2: Force keyframe by track replacement (more reliable)
      const currentTrack = videoSender.track
      if (currentTrack && currentTrack.readyState === 'live') {
        this.logger.debug('Forcing keyframe through track replacement')
        
        // Briefly remove and re-add the track to force keyframe generation
        await videoSender.replaceTrack(null)
        
        // Small delay to ensure the replacement is processed
        await new Promise(resolve => setTimeout(resolve, 10))
        
        await videoSender.replaceTrack(currentTrack)
        
        this.logger.info('Keyframe requested successfully via track replacement')
      } else {
        this.logger.warn(`Video track not in live state: ${currentTrack?.readyState}`)
        throw new Error('Video track is not in live state')
      }
      
    } catch (error) {
      this.logger.error('Failed to request keyframe:', error)
      throw error
    }
  }

  /**
   * Trigger ICE restart (recovery action)
   * This can help with connectivity issues
   */
  async triggerICERestart(): Promise<void> {
    try {
      this.restartIce()
      this.logger.debug('ICE restart triggered successfully')
    } catch (error) {
      this.logger.error('Failed to trigger ICE restart', error)
      throw error
    }
  }

  /**
   * Trigger full re-negotiation (reinvite) for connection recovery
   * This is different from ICE restart - it creates a completely new SDP offer/answer cycle
   * This can help with complex negotiation issues or codec problems
   */
  async triggerReinvite(): Promise<void> {
    if (this._negotiating) {
      this.logger.warn('Cannot trigger reinvite during active negotiation')
      throw new Error('Negotiation already in progress')
    }

    if (!this.instance) {
      this.logger.error('Cannot trigger reinvite: RTCPeerConnection instance not available')
      throw new Error('RTCPeerConnection instance not available')
    }

    try {
      this.logger.info('Triggering full re-negotiation (reinvite)')
      
      // Reset negotiation state to allow new negotiation
      this._negotiating = false
      this._restartingIce = false
      this._processingRemoteSDP = false
      this._processingLocalSDP = false
      
      // For reinvite, we always act as the offerer to initiate the new negotiation
      this.type = 'offer'
      
      // Clear any pending negotiation promises to start fresh
      this._waitNegotiation = Promise.resolve()
      
      // Start a new negotiation cycle with force=true to bypass state checks
      await this.startNegotiation(true)
      
      this.logger.info('Reinvite (full re-negotiation) initiated successfully')
    } catch (error) {
      this.logger.error('Failed to trigger reinvite:', error)
      throw error
    }
  }

  /**
   * Trigger manual recovery action
   * @param type Type of recovery action to perform
   */
  async triggerRecovery(type: RecoveryType): Promise<void> {
    if (!this._statsMonitor) {
      throw new Error('Stats monitoring is not initialized')
    }

    try {
      await this._statsMonitor.triggerRecovery(type)
      this.logger.debug(`Recovery action ${type} triggered successfully`)
    } catch (error) {
      this.logger.error(`Failed to trigger recovery action ${type}`, error)
      throw error
    }
  }
}
