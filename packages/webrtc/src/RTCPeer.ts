import { logger, EventEmitter } from '@signalwire/core'
import { getUserMedia, getMediaConstraints } from './utils/helpers'
import {
  sdpStereoHack,
  sdpBitrateHack,
  sdpMediaOrderHack,
} from './utils/sdpHelpers'
import { BaseConnection } from './BaseConnection'
import {
  sdpToJsonHack,
  RTCPeerConnection,
  streamIsValid,
  stopTrack,
} from './utils/webrtcHelpers'
import { ConnectionOptions } from './utils/interfaces'

export default class RTCPeer<EventTypes extends EventEmitter.ValidEventTypes> {
  public instance: RTCPeerConnection

  private options: ConnectionOptions
  private _iceTimeout: any
  private _negotiating = false
  /**
   * Both of these properties are used to have granular
   * control over when to `resolve` and when `reject` the
   * `start()` method.
   */
  private _resolveStartMethod: (value?: unknown) => void
  private _rejectStartMethod: (error: unknown) => void

  constructor(
    public call: BaseConnection<EventTypes>,
    public type: RTCSdpType
  ) {
    this.options = call.options
    logger.debug('New Peer with type:', this.type, 'Options:', this.options)

    this._onIce = this._onIce.bind(this)
    this.instance = RTCPeerConnection(this.config)
    this._attachListeners()
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
    const { iceServers = [], rtcPeerConfig = {} } = this.options
    const config: RTCConfiguration = {
      bundlePolicy: 'max-compat',
      iceServers,
      // @ts-ignore
      sdpSemantics: 'unified-plan',
      ...rtcPeerConfig,
    }
    logger.debug('RTC config', config)
    return config
  }

  get localSdp() {
    return this.instance?.localDescription?.sdp
  }

  stopTrackSender(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender) {
        return logger.info(`There is not a '${kind}' sender to stop.`)
      }
      if (sender.track) {
        stopTrack(sender.track)
        this.options?.localStream?.removeTrack(sender.track)
      }
    } catch (error) {
      logger.error('RTCPeer stopTrackSender error', kind, error)
    }
  }

  async restoreTrackSender(kind: string) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender) {
        return logger.info(`There is not a '${kind}' sender to restore.`)
      }
      if (sender.track && sender.track.readyState !== 'ended') {
        return logger.info(`There is already an active ${kind} track.`)
      }
      const constraints = await getMediaConstraints(this.options)
      // @ts-ignore
      const stream = await getUserMedia({ [kind]: constraints[kind] })
      if (stream && streamIsValid(stream)) {
        const newTrack = stream.getTracks().find((t) => t.kind === kind)
        if (newTrack) {
          await sender.replaceTrack(newTrack)
          this.options?.localStream?.addTrack(newTrack)
        }
      }
    } catch (error) {
      logger.error('RTCPeer restoreTrackSender error', kind, error)
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
      logger.error('RTCPeer getDeviceId error', kind, error)
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
      logger.error('RTCPeer getTrackSettings error', kind, error)
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
      logger.error('RTCPeer getDeviceLabel error', kind, error)
      return null
    }
  }

  restartIceWithRelayOnly() {
    try {
      const config = this.instance.getConfiguration()
      if (config.iceTransportPolicy === 'relay') {
        return logger.warn('RTCPeer already with iceTransportPolicy relay only')
      }
      const newConfig: RTCConfiguration = {
        ...config,
        iceTransportPolicy: 'relay',
      }
      this.instance.setConfiguration(newConfig)
      // @ts-ignore
      this.instance.restartIce()
    } catch (error) {
      logger.error('RTCPeer restartIce error', error)
    }
  }

  async applyMediaConstraints(
    kind: string,
    constraints: MediaTrackConstraints
  ) {
    try {
      const sender = this._getSenderByKind(kind)
      if (!sender || !sender.track) {
        return logger.info('No sender to apply constraints', kind, constraints)
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
        logger.info(`Apply ${kind} constraints`, this.call.id, newConstraints)
        await sender.track.applyConstraints(newConstraints)
      }
    } catch (error) {
      logger.error('Error applying constraints', kind, constraints)
    }
  }

  private _getSenderByKind(kind: string) {
    if (!this.instance.getSenders) {
      logger.warn('RTCPeerConnection.getSenders() not available.')
      return null
    }
    return this.instance
      .getSenders()
      .find(({ track }) => track && track.kind === kind)
  }

  private _getReceiverByKind(kind: string) {
    if (!this.instance.getReceivers) {
      logger.warn('RTCPeerConnection.getReceivers() not available.')
      return null
    }
    return this.instance
      .getReceivers()
      .find(({ track }) => track && track.kind === kind)
  }

  async startNegotiation(force = false) {
    if (this._negotiating) {
      return logger.warn('Skip twice onnegotiationneeded!')
    }
    this._negotiating = true
    try {
      /**
       * additionalDevice and screenShare are `sendonly`
       */
      if (this.options.additionalDevice || this.options.screenShare) {
        this.instance.getTransceivers?.().forEach((tr) => {
          tr.direction = 'sendonly'
        })
      }

      this.instance.removeEventListener('icecandidate', this._onIce)
      this.instance.addEventListener('icecandidate', this._onIce)

      if (this.isOffer) {
        logger.debug('Trying to generate offer')
        const offer = await this.instance.createOffer({
          /**
           * While this property is deprected, on Browsers where this
           * is still supported this avoids conflicting with the VAD
           * server-side
           */
          // @ts-ignore
          voiceActivityDetection: false,
        })
        await this._setLocalDescription(offer)
      }

      if (this.isAnswer) {
        logger.debug('Trying to generate answer')
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
    } catch (error) {
      logger.error(`Error creating ${this.type}:`, error)
    }
  }

  async onRemoteSdp(sdp: string) {
    try {
      const type = this.isOffer ? 'answer' : 'offer'
      await this._setRemoteDescription({ sdp, type })
    } catch (error) {
      logger.error(`Error handling remote SDP on call ${this.call.id}:`, error)
      this.call.hangup()
    }
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      this._resolveStartMethod = resolve
      this._rejectStartMethod = reject

      this.options.localStream = await this._retrieveLocalStream()

      const { localStream = null } = this.options
      if (localStream && streamIsValid(localStream)) {
        const audioTracks = localStream.getAudioTracks()
        logger.debug('Local audio tracks: ', audioTracks)
        const videoTracks = localStream.getVideoTracks()
        logger.debug('Local video tracks: ', videoTracks)
        // FIXME: use transceivers way only for offer - when answer gotta match mid from the ones from SRD
        if (
          this.isOffer &&
          typeof this.instance.addTransceiver === 'function'
        ) {
          // Use addTransceiver

          audioTracks.forEach((track) => {
            this.instance.addTransceiver(track, {
              direction: 'sendrecv',
              streams: [localStream],
            })
          })

          const transceiverParams: RTCRtpTransceiverInit = {
            direction: 'sendrecv',
            streams: [localStream],
          }
          if (this.isSimulcast) {
            const rids = ['0', '1', '2']
            transceiverParams.sendEncodings = rids.map((rid) => ({
              active: true,
              rid: rid,
              scaleResolutionDownBy: Number(rid) * 6 || 1.0,
            }))
          }
          logger.debug('Applying video transceiverParams', transceiverParams)
          videoTracks.forEach((track) => {
            this.instance.addTransceiver(track, transceiverParams)
          })

          if (this.isSfu) {
            const { msStreamsNumber = 5 } = this.options
            logger.debug('Add ', msStreamsNumber, 'recvonly MS Streams')
            transceiverParams.direction = 'recvonly'
            for (let i = 0; i < Number(msStreamsNumber); i++) {
              this.instance.addTransceiver('video', transceiverParams)
            }
          }
        } else if (typeof this.instance.addTrack === 'function') {
          // Use addTrack

          audioTracks.forEach((track) => {
            this.instance.addTrack(track, localStream)
          })

          videoTracks.forEach((track) => {
            this.instance.addTrack(track, localStream)
          })
        } else {
          // Fallback to legacy addStream ..
          // @ts-ignore
          this.instance.addStream(localStream)
        }
      }

      if (this.isOffer) {
        if (this.options.negotiateAudio) {
          this._checkMediaToNegotiate('audio')
        }
        if (this.options.negotiateVideo) {
          this._checkMediaToNegotiate('video')
        }
      } else {
        this.startNegotiation()
      }
    })
  }

  private _checkMediaToNegotiate(kind: string) {
    // addTransceiver of 'kind' if not present
    const sender = this._getSenderByKind(kind)
    if (!sender && this.instance.addTransceiver) {
      const transceiver = this.instance.addTransceiver(kind)
      logger.debug('Add transceiver', kind, transceiver)
    }
  }

  private async _sdpReady() {
    clearTimeout(this._iceTimeout)
    this._iceTimeout = null
    if (!this.instance.localDescription) {
      return
    }
    const { sdp, type } = this.instance.localDescription
    if (sdp.indexOf('candidate') === -1) {
      logger.debug('No candidate - retry \n')
      this.startNegotiation(true)
      return
    }
    logger.debug('LOCAL SDP \n', `Type: ${type}`, '\n\n', sdp)
    this.instance.removeEventListener('icecandidate', this._onIce)

    try {
      await this.call.onLocalSDPReady(this.instance.localDescription)

      this._resolveStartMethod()
    } catch (error) {
      this._rejectStartMethod(error)
    }
  }

  private _onIce(event: RTCPeerConnectionIceEvent) {
    if (!this._iceTimeout) {
      this._iceTimeout = setTimeout(
        () => this._sdpReady(),
        this.options.iceGatheringTimeout
      )
    }
    if (event.candidate) {
      logger.debug('IceCandidate:', event.candidate)
      // @ts-expect-error
      this.call.emit('icecandidate', event)
    } else {
      this._sdpReady()
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

    logger.debug(
      'LOCAL SDP \n',
      `Type: ${localDescription.type}`,
      '\n\n',
      localDescription.sdp
    )
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
    logger.debug(
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
      logger.debug('signalingState:', this.instance.signalingState)

      switch (this.instance.signalingState) {
        case 'stable':
          // Workaround to skip nested negotiations
          // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=740501
          this._negotiating = false
          break
        case 'closed':
          // @ts-ignore
          delete this.instance
          break
        default:
          this._negotiating = true
      }
    })

    this.instance.addEventListener('negotiationneeded', () => {
      logger.debug('Negotiation needed event')
      this.startNegotiation()
    })

    this.instance.addEventListener('iceconnectionstatechange', () => {
      logger.debug('iceConnectionState:', this.instance.iceConnectionState)
    })

    this.instance.addEventListener('icegatheringstatechange', () => {
      logger.debug('iceGatheringState:', this.instance.iceGatheringState)
    })

    // this.instance.addEventListener('icecandidateerror', (event) => {
    //   logger.warn('IceCandidate Error:', event)
    // })

    this.instance.addEventListener('track', (event: RTCTrackEvent) => {
      // @ts-expect-error
      this.call.emit('track', event)

      if (this.isSfu) {
        // const notification = { type: 'trackAdd', event }
        // this.call._dispatchNotification(notification)
      }
      this.options.remoteStream = event.streams[0]
    })

    // @ts-ignore
    this.instance.addEventListener('addstream', (event: MediaStreamEvent) => {
      if (event.stream) {
        this.options.remoteStream = event.stream
      }
    })
  }
}
