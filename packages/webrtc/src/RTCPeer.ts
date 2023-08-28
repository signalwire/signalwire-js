import { EventEmitter, getLogger, uuid } from '@signalwire/core'
import { getUserMedia, getMediaConstraints } from './utils/helpers'
import {
  sdpStereoHack,
  sdpBitrateHack,
  sdpMediaOrderHack,
  sdpHasValidCandidates,
} from './utils/sdpHelpers'
import { BaseConnection } from './BaseConnection'
import {
  sdpToJsonHack,
  RTCPeerConnection,
  streamIsValid,
  stopTrack,
} from './utils'
import { watchRTCPeerMediaPackets } from './utils/watchRTCPeerMediaPackets'

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
  /**
   * Both of these properties are used to have granular
   * control over when to `resolve` and when `reject` the
   * `start()` method.
   */
  private _resolveStartMethod: (value?: unknown) => void
  private _rejectStartMethod: (error: unknown) => void

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
  }

  get options() {
    return this.call.options
  }

  get watchMediaPacketsTimeout() {
    return this.options.watchMediaPacketsTimeout ?? 2_000
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
      iceServers: this.call.iceServers,
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
    // @ts-ignore
    this.instance.restartIce()
  }

  triggerResume() {
    this.logger.info('Probably half-open so force close from client')
    if (this._resumeTimer) {
      this.logger.info('[skipped] Already in "resume" state')
      return
    }
    // @ts-expect-error
    this.call.emit('media.disconnected')

    // @ts-expect-error
    this.call.emit('media.reconnecting')
    this.clearTimers()
    this._resumeTimer = setTimeout(() => {
      this.logger.warn('Disconnecting due to RECONNECTION_ATTEMPT_TIMEOUT')
      // @ts-expect-error
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
        await sender.track.applyConstraints(newConstraints)
      }
    } catch (error) {
      this.logger.error('Error applying constraints', kind, constraints)
    }
  }

  private _getSenderByKind(kind: string) {
    if (!this.instance.getSenders) {
      this.logger.warn('RTCPeerConnection.getSenders() not available.')
      return null
    }
    return this.instance
      .getSenders()
      .find(({ track }) => track && track.kind === kind)
  }

  private _getReceiverByKind(kind: string) {
    if (!this.instance.getReceivers) {
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
       * ReactNative Workaround
       */
      if (force) {
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
    }
  }

  onRemoteBye({ code, message }: { code: string; message: string }) {
    // It could be a negotiation/signaling error so reject the "startMethod"
    this._rejectStartMethod?.({
      code,
      message,
    })
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
      this._processingRemoteSDP = true
      const type = this.isOffer ? 'answer' : 'offer'
      await this._setRemoteDescription({ sdp, type })
      this._processingRemoteSDP = false

      /**
       * Resolve the start() method only for Offer because for Answer
       * we need to reply to the server and wait for the signaling.
       */
      if (this.isOffer) {
        this._resolveStartMethod()
      }

      this.resetNeedResume()
    } catch (error) {
      this.logger.error(
        `Error handling remote SDP on call ${this.call.id}:`,
        error
      )
      this.call.hangup()
      this._rejectStartMethod(error)
    }
  }

  private _setupRTCPeerConnection() {
    if (!this.instance) {
      this.instance = RTCPeerConnection(this.config)
      this._attachListeners()
    }
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      this._resolveStartMethod = resolve
      this._rejectStartMethod = reject

      try {
        this._localStream = await this._retrieveLocalStream()
      } catch (error) {
        this._rejectStartMethod(error)
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
        if (
          this.isOffer &&
          typeof this.instance.addTransceiver === 'function'
        ) {
          const audioTransceiverParams: RTCRtpTransceiverInit = {
            direction: this.options.negotiateAudio ? 'sendrecv' : 'sendonly',
            streams: [this._localStream],
          }
          this.logger.debug(
            'Applying audioTransceiverParams',
            audioTransceiverParams
          )
          audioTracks.forEach((track) => {
            this.instance.addTransceiver(track, audioTransceiverParams)
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
          videoTracks.forEach((track) => {
            this.instance.addTransceiver(track, videoTransceiverParams)
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
        if (this.options.negotiateAudio) {
          this._checkMediaToNegotiate('audio')
        }
        if (this.options.negotiateVideo) {
          this._checkMediaToNegotiate('video')
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
    // Do not use `stopTrack` util to not dispatch the `ended` event
    this._localStream?.getTracks().forEach((track) => track.stop())
    this._remoteStream?.getTracks().forEach((track) => track.stop())

    this.instance?.close()

    this.stopWatchMediaPackets()
  }

  private _supportsAddTransceiver() {
    return typeof this.instance.addTransceiver === 'function'
  }

  private _checkMediaToNegotiate(kind: string) {
    // addTransceiver of 'kind' if not present
    const sender = this._getSenderByKind(kind)
    if (!sender && this._supportsAddTransceiver()) {
      const transceiver = this.instance.addTransceiver(kind, {
        direction: 'recvonly',
      })
      this.logger.debug('Add transceiver', kind, transceiver)
    }
  }

  private async _sdpReady() {
    clearTimeout(this._iceTimeout)

    if (!this.instance.localDescription) {
      this.logger.error('Missing localDescription', this.instance)
      return
    }
    const { sdp } = this.instance.localDescription
    if (sdp.indexOf('candidate') === -1) {
      this.logger.debug('No candidate - retry \n')
      this.startNegotiation(true)
      return
    }

    if (!this._sdpIsValid()) {
      this.logger.info('SDP ready but not valid')
      this._onIceTimeout()
      return
    }

    this.instance.removeEventListener('icecandidate', this._onIce)

    try {
      await this.call.onLocalSDPReady(this)

      if (this.isAnswer) {
        this._resolveStartMethod()
      }
    } catch (error) {
      this._rejectStartMethod(error)
    }
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
      this._rejectStartMethod({
        code: 'ICE_GATHERING_FAILED',
        message: 'Ice gathering timeout',
      })
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
      this._sdpReady()
      return
    }

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
       * With `srflx`, `prflx` or `relay` candidates
       * set timeout to iceGatheringTimeout and then invoke
       * _sdpReady since at least one candidate is valid.
       */
      this._iceTimeout = setTimeout(() => {
        this.instance.removeEventListener('icecandidate', this._onIce)
        this._sdpReady()
      }, this.options.iceGatheringTimeout)
    }
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
            this.restartIceWithRelayOnly()
          }, this.options.maxConnectionStateTimeout)
          break
        case 'connected':
          this.clearConnectionStateTimer()
          this.emitMediaConnected()
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
    // @ts-expect-error
    this.call.emit('media.connected')
  }

  private _onEndedTrackHandler(event: Event) {
    const mediaTrack = event.target as MediaStreamTrack
    const evt = mediaTrack.kind === 'audio' ? 'microphone' : 'camera'
    // @ts-expect-error
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
}
