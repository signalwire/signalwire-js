import {
  logger,
  VertoBye,
  VertoInfo,
  VertoInvite,
  // VertoModify,
  BaseComponent,
  SwWebRTCCallState,
  VertoMethod,
  ConferenceMethod,
  selectors,
  BaseComponentOptions,
  CallEvents,
} from '@signalwire/core'
import RTCPeer from './RTCPeer'
import { DEFAULT_CALL_OPTIONS, PeerType, Direction } from './utils/constants'
import {
  enableAudioTracks,
  disableAudioTracks,
  toggleAudioTracks,
  enableVideoTracks,
  disableVideoTracks,
  toggleVideoTracks,
} from './utils/helpers'
import { CallOptions } from './utils/interfaces'
import { stopStream } from './utils/webrtcHelpers'

const ROOM_EVENTS = [
  'room.started',
  'room.subscribed',
  'room.updated',
  'room.ended',
  'member.joined',
  'member.updated',
  'member.left',
  'layout.changed',
]

type BaseCallOptions<T extends string> = CallOptions &
  BaseComponentOptions<BaseCall<T>, T>
export class BaseCall<
  EventType extends string = CallEvents
> extends BaseComponent<EventType> {
  public nodeId = ''
  public direction: Direction
  public peer: RTCPeer<EventType>
  public options: BaseCallOptions<EventType>
  public cause: string
  public causeCode: string
  public gotEarly = false
  public screenShare?: BaseCall<EventType>
  public secondSource?: BaseCall<EventType>
  public doReinvite = false
  public isDirect = false
  public videoElements: HTMLVideoElement[] = []
  public audioElements: HTMLAudioElement[] = []
  public participantLayerIndex = -1
  public participantLogo = ''
  private state = SwWebRTCCallState.New
  private prevState = SwWebRTCCallState.New

  private _extension: string
  // @ts-expect-error
  private _roomId: string
  private _roomSessionId: string
  private _memberId: string

  constructor(options: BaseCallOptions<EventType>) {
    super(options)

    const iceServers =
      options?.iceServers ?? this.select(selectors.getIceServers)

    this.options = {
      id: this.id,
      ...DEFAULT_CALL_OPTIONS,
      ...options,
      iceServers,
    }

    const { remoteCallerNumber } = this.options
    // if (!userVariables || objEmpty(userVariables)) {
    //   this.options.userVariables = this.session.options.userVariables || {}
    // }
    // this.options.userVariables.hostname = getHostname()
    if (!remoteCallerNumber) {
      this.options.remoteCallerNumber = this.options.destinationNumber
    }

    this.setState(SwWebRTCCallState.New)
    logger.info('New Call with Options:', this.options)
  }

  get active() {
    return this.state === SwWebRTCCallState.Active
  }

  get trying() {
    return this.state === SwWebRTCCallState.Trying
  }

  get extension() {
    return this._extension || this.options.destinationNumber
  }

  get memberId() {
    return this._memberId
  }

  set extension(extension: string) {
    this._extension = extension
  }

  get localStream() {
    return this.options.localStream
  }

  get remoteStream() {
    return this.options.remoteStream
  }

  get messagePayload() {
    // if (this.session.relayProtocol === VERTO_PROTOCOL) {
    //   return { sessid: this.session.sessionid, dialogParams: this.options }
    // }
    // FIXME: Send only the fields relay accepts
    const {
      id,
      destinationNumber,
      attach,
      callerName,
      callerNumber,
      remoteCallerName,
      remoteCallerNumber,
      userVariables,
      screenShare,
    } = this.options
    return {
      sessid: this.options.sessionid,
      dialogParams: {
        id,
        destinationNumber,
        attach,
        callerName,
        callerNumber,
        remoteCallerName,
        remoteCallerNumber,
        userVariables,
        screenShare,
      },
    }
  }

  // get participantId() {
  //   return this.pvtData ? String(this.pvtData.conferenceMemberID) : null
  // }

  get cameraId() {
    return this.peer ? this.peer.getDeviceId('video') : null
  }

  get cameraLabel() {
    return this.peer ? this.peer.getDeviceLabel('video') : null
  }

  get microphoneId() {
    return this.peer ? this.peer.getDeviceId('audio') : null
  }

  get microphoneLabel() {
    return this.peer ? this.peer.getDeviceLabel('audio') : null
  }

  get withAudio() {
    // TODO: use peer to check audio tracks
    return this.remoteStream
      ? this.remoteStream.getAudioTracks().length > 0
      : false
  }

  get withVideo() {
    // TODO: use peer to check video tracks
    return this.remoteStream
      ? this.remoteStream.getVideoTracks().length > 0
      : false
  }

  get htmlVideoElement() {
    return this.videoElements.length ? this.videoElements[0] : null
  }

  get htmlAudioElement() {
    return this.audioElements.length ? this.audioElements[0] : null
  }

  get localVideoTrack() {
    return this.peer.localVideoTrack
  }

  get localAudioTrack() {
    return this.peer.localAudioTrack
  }

  /**
   * Verto messages have to be wrapped into a blade.execute
   * request and sent using the 'video.message' method.
   */
  public vertoExecute(vertoMessage: any) {
    const params: any = {
      message: vertoMessage,
      node_id: this.nodeId,
    }
    if (vertoMessage.method === VertoMethod.Invite) {
      params.subscribe = ROOM_EVENTS
    }

    return this.execute({
      method: 'video.message',
      params,
    })
  }

  public onStateChange(component: any) {
    logger.debug('onStateChange', component)
    switch (component.state) {
      case SwWebRTCCallState.Hangup:
        this._hangup(component)
        break
      default:
        this.setState(component.state)
        break
    }
  }

  public onRemoteSDP(component: any) {
    logger.debug('onRemoteSDP', component)
    if (component.remoteSDP) {
      this.peer.onRemoteSdp(component.remoteSDP)
    }
  }

  public onRoomId(component: any) {
    logger.debug('onRoomId', component)
    this._roomId = component.roomId
    this._roomSessionId = component.roomSessionId
    this._memberId = component.memberId
  }

  // async updateDevices(constraints: MediaStreamConstraints): Promise<void> {
  //   try {
  //     console.debug('updateDevices trying constraints', this.id, constraints)
  //     if (!Object.keys(constraints).length) {
  //       return console.warn('Invalid constraints:', constraints)
  //     }
  //     const newStream = await getUserMedia(constraints)
  //     console.debug('updateDevices got stream', newStream)
  //     if (!this.options.localStream) {
  //       this.options.localStream = new MediaStream()
  //     }
  //     const { instance } = this.peer
  //     const tracks = newStream.getTracks()
  //     for (let i = 0; i < tracks.length; i++) {
  //       const newTrack = tracks[i]
  //       console.debug('updateDevices apply track: ', newTrack)
  //       const transceiver = instance
  //         .getTransceivers()
  //         .find(({ mid, sender, receiver }) => {
  //           if (sender.track && sender.track.kind === newTrack.kind) {
  //             console.debug('Found transceiver by sender')
  //             return true
  //           }
  //           if (receiver.track && receiver.track.kind === newTrack.kind) {
  //             console.debug('Found transceiver by receiver')
  //             return true
  //           }
  //           if (mid === null) {
  //             console.debug('Found disassociated transceiver')
  //             return true
  //           }
  //           return false
  //         })
  //       if (transceiver && transceiver.sender) {
  //         console.debug(
  //           'updateDevices FOUND - replaceTrack on it and on localStream'
  //         )
  //         await transceiver.sender.replaceTrack(newTrack)
  //         this.options.localStream.addTrack(newTrack)
  //         console.debug('updateDevices replaceTrack SUCCESS')
  //         this.options.localStream.getTracks().forEach((track) => {
  //           if (track.kind === newTrack.kind && track.id !== newTrack.id) {
  //             console.debug('updateDevices stop old track and apply new one - ')
  //             stopTrack(track)
  //             this.options.localStream.removeTrack(track)
  //           }
  //         })
  //       } else {
  //         console.debug('updateDevices NOT FOUND - addTrack and start dancing!')
  //         this.peer.type = PeerType.Offer
  //         this.doReinvite = true
  //         this.options.localStream.addTrack(newTrack)
  //         instance.addTrack(newTrack, this.options.localStream)
  //       }
  //       console.debug('updateDevices Simply update mic/cam')
  //       if (newTrack.kind === 'audio') {
  //         this.options.micId = newTrack.getSettings().deviceId
  //       } else if (newTrack.kind === 'video') {
  //         this.options.camId = newTrack.getSettings().deviceId
  //       }
  //     }
  //     console.debug('updateDevices done!')
  //     this._dispatchNotification({ type: Notification.DeviceUpdated })
  //   } catch (error) {
  //     console.error('updateDevices', error)
  //     throw error
  //   }
  // }

  join = this.invite

  invite() {
    return new Promise(async (resolve, reject) => {
      this.direction = Direction.Outbound
      this.peer = new RTCPeer(this, PeerType.Offer)
      try {
        const _resolve = () => resolve(this)
        // @ts-ignore
        this.once('active', () => {
          // @ts-ignore
          this.off('destroy', _resolve)
          _resolve()
        })
        // @ts-ignore
        this.once('destroy', _resolve)
        await this.peer.start()
      } catch (error) {
        logger.error('Join error', error)
        reject(error)
      }
    })
  }

  async answer() {
    this.direction = Direction.Inbound
    this.peer = new RTCPeer(this, PeerType.Answer)
    try {
      await this.peer.start()
    } catch (error) {
      logger.error('Answer error', error)
    }
  }

  onLocalSDPReady(localDescription: RTCSessionDescription) {
    const { type, sdp } = localDescription
    logger.info('SDP READY', type, sdp)
    switch (type) {
      case PeerType.Offer:
        // if (this.active) {
        //   this.executeUpdateMedia()
        // } else {
        this.executeInvite(sdp)
        // }
        break
      case PeerType.Answer:
        logger.warn('Unhandled verto.answer')
        // this.executeAnswer()
        break
      default:
        return logger.error(
          `Unknown SDP type: '${type}' on call ${this.options.id}`
        )
    }
  }

  async executeInvite(sdp: string) {
    this.setState(SwWebRTCCallState.Requesting)
    try {
      const msg = VertoInvite({ ...this.messagePayload, sdp })
      const response = await this.vertoExecute(msg)
      logger.debug('Invite response', response)
    } catch (error) {
      const { action, jsonrpc } = error
      logger.error('Invite Error', jsonrpc, action)
      if (jsonrpc?.code === '404') {
        this.setState(SwWebRTCCallState.Hangup)
      }
    }
  }

  // executeUpdateMedia() {
  //   //   const msg = new Modify({
  //   //     ...this.messagePayload,
  //   //     sdp: this.localSdp,
  //   //     action: 'updateMedia',
  //   //   })
  //   //   return this.vertoExecute(msg)
  // }

  // executeAnswer() {
  //   this.setState(SwWebRTCCallState.Answering)
  //   // const params = {
  //   //   ...this.messagePayload,
  //   //   sdp: this.localSdp,
  //   // }
  //   // const msg =
  //   //   this.options.attach === true ? new Attach(params) : new Answer(params)
  //   // return this.vertoExecute(msg)
  // }

  async hangup() {
    try {
      const bye = VertoBye(this.messagePayload)
      await this.vertoExecute(bye)
    } catch (error) {
      logger.error('Hangup error:', error)
    } finally {
      this._hangup()
    }
  }

  dtmf(dtmf: string) {
    const msg = VertoInfo({ ...this.messagePayload, dtmf })
    this.vertoExecute(msg)
  }

  disableOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && disableAudioTracks(this.options.localStream)
  }

  enableOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && enableAudioTracks(this.options.localStream)
  }

  toggleOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && toggleAudioTracks(this.options.localStream)
  }

  disableOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && disableVideoTracks(this.options.localStream)
  }

  enableOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && enableVideoTracks(this.options.localStream)
  }

  toggleOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && toggleVideoTracks(this.options.localStream)
  }

  /**
   * Deaf
   */
  disableInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && disableAudioTracks(this.options.remoteStream)
  }

  /**
   * Undeaf
   */
  enableInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && enableAudioTracks(this.options.remoteStream)
  }

  /**
   * Toggle Deaf
   */
  toggleInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && toggleAudioTracks(this.options.remoteStream)
  }

  doReinviteWithRelayOnly() {
    if (this.peer && this.active) {
      this.peer.restartIceWithRelayOnly()
    }
  }

  stopOutboundAudio() {
    if (this.peer && this.active) {
      this.peer.stopTrackSender('audio')
    }
  }

  restoreOutboundAudio() {
    if (this.peer && this.active) {
      this.peer.restoreTrackSender('audio')
    }
  }

  stopOutboundVideo() {
    if (this.peer && this.active) {
      this.peer.stopTrackSender('video')
    }
  }

  restoreOutboundVideo() {
    if (this.peer && this.active) {
      this.peer.restoreTrackSender('video')
    }
  }

  setState(state: SwWebRTCCallState) {
    this.prevState = this.state
    this.state = state
    logger.debug(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    )

    this.emit(this.state as EventType, this)

    switch (state) {
      case SwWebRTCCallState.Purge: {
        if (this.screenShare instanceof BaseCall) {
          this.screenShare.setState(SwWebRTCCallState.Purge)
        }
        if (this.secondSource instanceof BaseCall) {
          this.secondSource.setState(SwWebRTCCallState.Purge)
        }
        this._finalize()
        break
      }
      case SwWebRTCCallState.Hangup: {
        if (this.screenShare instanceof BaseCall) {
          this.screenShare.hangup()
        }
        if (this.secondSource instanceof BaseCall) {
          this.secondSource.hangup()
        }
        this.setState(SwWebRTCCallState.Destroy)
        break
      }
      case SwWebRTCCallState.Destroy:
        this._finalize()
        break
    }
  }

  public audioMute(memberId?: string) {
    return this.execute({
      method: ConferenceMethod.MemberAudioMute,
      params: {
        room_session_id: this._roomSessionId,
        member_id: memberId || this._memberId,
      },
    })
  }

  public audioUnmute(memberId?: string) {
    return this.execute({
      method: ConferenceMethod.MemberAudioUnmute,
      params: {
        room_session_id: this._roomSessionId,
        member_id: memberId || this._memberId,
      },
    })
  }

  public videoMute(memberId?: string) {
    return this.execute({
      method: ConferenceMethod.MemberVideoMute,
      params: {
        room_session_id: this._roomSessionId,
        member_id: memberId || this._memberId,
      },
    })
  }

  public videoUnmute(memberId?: string) {
    return this.execute({
      method: ConferenceMethod.MemberVideoUnmute,
      params: {
        room_session_id: this._roomSessionId,
        member_id: memberId || this._memberId,
      },
    })
  }

  // updateFromLaChannel(muted: boolean, vmuted: boolean) {
  //   this._laChannelAudioMuted = muted
  //   if (this._laChannelVideoMuted !== vmuted) {
  //     vmuted ? this.stopOutboundVideo() : this.restoreOutboundVideo()
  //   }
  //   this._laChannelVideoMuted = vmuted
  // }

  private _hangup(params: any = {}) {
    const {
      byeCause = 'NORMAL_CLEARING',
      byeCauseCode = '16',
      redirectDestination,
    } = params
    this.cause = byeCause
    this.causeCode = byeCauseCode
    if (redirectDestination && this.trying && this.peer.localSdp) {
      logger.warn('Execute invite again')
      return this.executeInvite(this.peer.localSdp)
    }
    return this.setState(SwWebRTCCallState.Hangup)
  }

  // private _onParticipantData(params: any) {
  //   // TODO: manage caller_id_name, caller_id_number, callee_id_name, callee_id_number
  //   const {
  //     display_name: displayName,
  //     display_number: displayNumber,
  //     display_direction,
  //     ...rest
  //   } = params
  //   this.extension = displayNumber
  //   const displayDirection =
  //     display_direction === Direction.Inbound
  //       ? Direction.Outbound
  //       : Direction.Inbound
  //   this._dispatchNotification({
  //     type: Notification.ParticipantData,
  //     displayName,
  //     displayNumber,
  //     displayDirection,
  //     ...rest,
  //   })
  // }

  protected _finalize() {
    if (this.peer && this.peer.instance) {
      this.peer.instance.close()
      // @ts-ignore
      delete this.peer
    }
    const { remoteStream, localStream } = this.options
    stopStream(remoteStream)
    stopStream(localStream)
    this.destroy()
  }
}
