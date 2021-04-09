import {
  uuid,
  logger,
  Session,
  VertoBye,
  VertoInfo,
  VertoModify,
} from '@signalwire/core'
import { JSONRPCRequest } from '@signalwire/core/dist/core/src/utils/interfaces'
import RTCPeer from './RTCPeer'
import {
  CallState,
  DEFAULT_CALL_OPTIONS,
  PeerType,
  Notification,
  Direction,
} from './utils/constants'
import {
  enableAudioTracks,
  disableAudioTracks,
  toggleAudioTracks,
  enableVideoTracks,
  disableVideoTracks,
  toggleVideoTracks,
} from './utils/helpers'
import {
  CallOptions,
  IHangupParams,
  ICallParticipant,
} from './utils/interfaces'
import {
  stopStream,
  stopTrack,
  // setMediaElementSinkId,
  getUserMedia,
  // getHostname,
} from './utils/webrtcHelpers'

export class BaseCall {
  public id = uuid()
  public nodeId = ''
  public direction: Direction
  public peer: RTCPeer
  public options: CallOptions
  public cause: string
  public causeCode: string
  public gotEarly = false
  public screenShare?: BaseCall
  public secondSource?: BaseCall
  public doReinvite = false
  public isDirect = false
  public videoElements: HTMLVideoElement[] = []
  public audioElements: HTMLAudioElement[] = []
  public participantLayerIndex = -1
  public participantLogo = ''
  private state = CallState.New
  private prevState = CallState.New

  private _extension: string = null

  constructor(public session: Session, options?: CallOptions) {
    this.options = {
      id: this.id,
      ...DEFAULT_CALL_OPTIONS,
      ...options,
    }

    const { userVariables, remoteCallerNumber } = this.options
    // if (!userVariables || objEmpty(userVariables)) {
    //   this.options.userVariables = this.session.options.userVariables || {}
    // }
    // this.options.userVariables.hostname = getHostname()
    if (!remoteCallerNumber) {
      this.options.remoteCallerNumber = this.options.destinationNumber
    }

    // if (isFunction(onNotification)) {
    //   register(this.id, onNotification.bind(this), SwEvent.Notification)
    // }
    // register(this.id, this._onMediaError, SwEvent.MediaError)
    // register(this.id, this._onVertoAnswer, VertoMethod.Answer)
    // register(this.id, this._onVertoMedia, VertoMethod.Media)
    // register(this.id, this._onVertoMediaParams, VertoMethod.MediaParams)
    // register(this.id, this._onVertoPrompt, VertoMethod.Prompt)
    // register(this.id, this._hangup, VertoMethod.Bye)
    // register(this.id, this._onParticipantData, VertoMethod.Display)
    // register(this.id, this._onVertoAttach, VertoMethod.Attach)
    // register(this.id, this._onGenericEvent, VertoMethod.Info)
    // register(this.id, this._onGenericEvent, VertoMethod.Event)

    this.setState(CallState.New)
    logger.info('New Call with Options:', this.options)
  }

  get active() {
    return this.state === CallState.Active
  }

  get trying() {
    return this.state === CallState.Trying
  }

  get extension() {
    return this._extension || this.options.destinationNumber
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
      sessid: this.session.sessionid,
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

  get currentParticipant(): Partial<ICallParticipant> {
    const participant = {
      id: this.participantId,
      role: this.participantRole,
      layer: null,
      layerIndex: this.participantLayerIndex,
      isLayerBehind: false,
    }
    // if (this.canvasInfo && this.participantLayerIndex >= 0) {
    //   const { layoutOverlap, canvasLayouts } = this.canvasInfo
    //   participant.layer = canvasLayouts[this.participantLayerIndex] || null
    //   participant.isLayerBehind =
    //     layoutOverlap && participant.layer && participant.layer.overlap === 0
    // }
    return participant
  }

  get participantId() {
    return this.pvtData ? String(this.pvtData.conferenceMemberID) : null
  }

  get participantRole() {
    return this.pvtData ? this.pvtData.role : null
  }

  get role() {
    return this.participantRole
  }

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

  // get conferenceChannels() {
  //   if (!this.pvtData) {
  //     return []
  //   }
  //   const { laChannel, chatChannel, infoChannel, modChannel } = this.pvtData
  //   return [laChannel, chatChannel, infoChannel, modChannel].filter(Boolean)
  // }

  // get conferenceName() {
  //   if (this.pvtData) {
  //     const { conferenceDisplayName, conferenceName } = this.pvtData
  //     return conferenceDisplayName || conferenceName
  //   }
  //   return null
  // }

  // get conferenceMd5() {
  //   return this.pvtData ? this.pvtData.conferenceMD5 : null
  // }

  // get conferenceUuid() {
  //   if (this.pvtData) {
  //     /**
  //      * If conferenceDisplayName is present conferenceName is the UUID to use
  //      * Otherwise just conferenceUUID
  //      */
  //     const {
  //       conferenceDisplayName,
  //       conferenceName,
  //       conferenceUUID,
  //     } = this.pvtData
  //     return conferenceDisplayName ? conferenceName : conferenceUUID
  //   }
  //   return null
  // }

  async updateDevices(constraints: MediaStreamConstraints): Promise<void> {
    try {
      console.debug('updateDevices trying constraints', this.id, constraints)
      if (!Object.keys(constraints).length) {
        return console.warn('Invalid constraints:', constraints)
      }
      const newStream = await getUserMedia(constraints)
      console.debug('updateDevices got stream', newStream)
      if (!this.options.localStream) {
        this.options.localStream = new MediaStream()
      }
      const { instance } = this.peer
      const tracks = newStream.getTracks()
      for (let i = 0; i < tracks.length; i++) {
        const newTrack = tracks[i]
        console.debug('updateDevices apply track: ', newTrack)
        const transceiver = instance
          .getTransceivers()
          .find(({ mid, sender, receiver }) => {
            if (sender.track && sender.track.kind === newTrack.kind) {
              console.debug('Found transceiver by sender')
              return true
            }
            if (receiver.track && receiver.track.kind === newTrack.kind) {
              console.debug('Found transceiver by receiver')
              return true
            }
            if (mid === null) {
              console.debug('Found disassociated transceiver')
              return true
            }
            return false
          })
        if (transceiver && transceiver.sender) {
          console.debug(
            'updateDevices FOUND - replaceTrack on it and on localStream'
          )
          await transceiver.sender.replaceTrack(newTrack)
          this.options.localStream.addTrack(newTrack)
          console.debug('updateDevices replaceTrack SUCCESS')
          this.options.localStream.getTracks().forEach((track) => {
            if (track.kind === newTrack.kind && track.id !== newTrack.id) {
              console.debug('updateDevices stop old track and apply new one - ')
              stopTrack(track)
              this.options.localStream.removeTrack(track)
            }
          })
        } else {
          console.debug('updateDevices NOT FOUND - addTrack and start dancing!')
          this.peer.type = PeerType.Offer
          this.doReinvite = true
          this.options.localStream.addTrack(newTrack)
          instance.addTrack(newTrack, this.options.localStream)
        }
        console.debug('updateDevices Simply update mic/cam')
        if (newTrack.kind === 'audio') {
          this.options.micId = newTrack.getSettings().deviceId
        } else if (newTrack.kind === 'video') {
          this.options.camId = newTrack.getSettings().deviceId
        }
      }
      console.debug('updateDevices done!')
      this._dispatchNotification({ type: Notification.DeviceUpdated })
    } catch (error) {
      console.error('updateDevices', error)
      throw error
    }
  }

  invite() {
    this.direction = Direction.Outbound
    this.peer = new RTCPeer(this, PeerType.Offer)
  }

  answer() {
    this.direction = Direction.Inbound
    this.peer = new RTCPeer(this, PeerType.Answer)
  }

  async hangup(params?: IHangupParams) {
    try {
      const bye = VertoBye(this.messagePayload)
      await this._execute(bye)
    } catch (error) {
      logger.error('Hangup error:', error)
    } finally {
      this._hangup(params)
    }
  }

  dtmf(dtmf: string) {
    const msg = VertoInfo({ ...this.messagePayload, dtmf })
    this._execute(msg)
  }

  sendCurrentMediaSettings() {
    const params = {
      type: 'mediaSettings',
      audioinput: this.peer.getTrackSettings('audio'),
      videoinput: this.peer.getTrackSettings('video'),
      audiooutput: {
        deviceId: this.options.speakerId,
      },
    }
    return this._sendVertoInfo(params)
  }

  private _sendVertoInfo(params: object) {
    const msg = VertoInfo({ ...this.messagePayload, ...params })
    return this._execute(msg)
  }

  hold() {
    return this._changeHold('hold')
  }

  unhold() {
    return this._changeHold('unhold')
  }

  toggleHold() {
    return this._changeHold('toggleHold')
  }

  disableOutboundAudio() {
    // TODO: Use peer method
    disableAudioTracks(this.options.localStream)
  }

  enableOutboundAudio() {
    // TODO: Use peer method
    enableAudioTracks(this.options.localStream)
  }

  toggleOutboundAudio() {
    // TODO: Use peer method
    toggleAudioTracks(this.options.localStream)
  }

  disableOutboundVideo() {
    // TODO: Use peer method
    disableVideoTracks(this.options.localStream)
  }

  enableOutboundVideo() {
    // TODO: Use peer method
    enableVideoTracks(this.options.localStream)
  }

  toggleOutboundVideo() {
    // TODO: Use peer method
    toggleVideoTracks(this.options.localStream)
  }

  /**
   * Deaf
   */
  disableInboundAudio() {
    // TODO: Use peer method
    disableAudioTracks(this.options.remoteStream)
  }

  /**
   * Undeaf
   */
  enableInboundAudio() {
    // TODO: Use peer method
    enableAudioTracks(this.options.remoteStream)
  }

  /**
   * Toggle Deaf
   */
  toggleInboundAudio() {
    // TODO: Use peer method
    toggleAudioTracks(this.options.remoteStream)
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

  setState(state: CallState) {
    this.prevState = this.state
    this.state = state
    logger.debug(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    )

    // this._dispatchNotification({ type: Notification.CallUpdate })

    switch (state) {
      case CallState.Purge: {
        if (this.screenShare instanceof BaseCall) {
          this.screenShare.setState(CallState.Purge)
        }
        if (this.secondSource instanceof BaseCall) {
          this.secondSource.setState(CallState.Purge)
        }
        this._finalize()
        break
      }
      // TODO: Handle setMediaElementSinkId at higher level
      // case CallState.Active: {
      //   setTimeout(() => {
      //     const { remoteElement, speakerId } = this.options
      //     setMediaElementSinkId(remoteElement, speakerId)
      //   }, 0)
      //   break
      // }
      case CallState.Hangup: {
        if (this.screenShare instanceof BaseCall) {
          this.screenShare.hangup()
        }
        if (this.secondSource instanceof BaseCall) {
          this.secondSource.hangup()
        }
        this.setState(CallState.Destroy)
        break
      }
      case CallState.Destroy:
        this._finalize()
        break
    }
  }

  // updateFromLaChannel(muted: boolean, vmuted: boolean) {
  //   this._laChannelAudioMuted = muted
  //   if (this._laChannelVideoMuted !== vmuted) {
  //     vmuted ? this.stopOutboundVideo() : this.restoreOutboundVideo()
  //   }
  //   this._laChannelVideoMuted = vmuted
  // }

  private async _changeHold(action: string) {
    if (this.state >= CallState.Hangup) {
      return logger.warn('This call is not active', this.id, this.state)
    }
    const msg = VertoModify({ ...this.messagePayload, action })
    try {
      const { holdState } = await this._execute(msg)
      holdState === 'active'
        ? this.setState(CallState.Active)
        : this.setState(CallState.Held)
      return true
    } catch (error) {
      logger.error('Error changing hold state', error)
      return false
    }
  }

  private _hangup(params: IHangupParams = {}) {
    const {
      cause = 'NORMAL_CLEARING',
      code = '16',
      redirectDestination = null,
    } = params
    this.cause = cause
    this.causeCode = code
    if (redirectDestination && this.trying) {
      return this.peer.executeInvite()
    }
    this.setState(CallState.Hangup)
  }

  // private _onMediaError(error: any) {
  //   this._dispatchNotification({ type: Notification.UserMediaError, error })
  //   this._hangup()
  // }

  // private _onGenericEvent(params: any) {
  //   this._dispatchNotification({ ...params, type: Notification.Generic })
  // }

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

  // private async _onVertoAnswer(params: any) {
  //   if (this.state >= CallState.Active) {
  //     return
  //   }
  //   if (!this.gotEarly) {
  //     await this.peer.onRemoteSdp(params.sdp)
  //   }
  //   this.isDirect = checkIsDirectCall(params)
  //   this.setState(CallState.Active)
  // }

  // private async _onVertoMedia(params: any) {
  //   if (this.state >= CallState.Early) {
  //     return
  //   }
  //   this.gotEarly = true
  //   await this.peer.onRemoteSdp(params.sdp)
  //   this.isDirect = checkIsDirectCall(params)
  //   this.setState(CallState.Early)
  // }

  // private _onVertoMediaParams(params: any) {
  //   const { mediaParams } = params
  //   if (this.options.autoApplyMediaParams === false) {
  //     return this._dispatchNotification({
  //       type: Notification.MediaParams,
  //       mediaParams,
  //     })
  //   }
  //   if (this.peer && mediaParams) {
  //     Object.keys(mediaParams).forEach((kind) => {
  //       this.peer.applyMediaConstraints(kind, mediaParams[kind])
  //     })
  //   }
  // }

  // private _onVertoPrompt(params: any) {
  //   const notification = {
  //     ...params,
  //     promptType: params.type,
  //     type: Notification.Prompt,
  //     call: this,
  //   }
  //   this._dispatchNotification(notification)
  // }

  // public _dispatchNotification(notification: any) {
  //   if (this.options.skipNotifications === true) {
  //     return
  //   }
  //   notification.call = this
  //   if (!trigger(this.id, notification, SwEvent.Notification, false)) {
  //     trigger(SwEvent.Notification, notification, this.session.uuid)
  //   }
  // }

  // public _dispatchConferenceUpdate(params: any) {
  //   this._dispatchNotification({
  //     type: Notification.ConferenceUpdate,
  //     ...params,
  //   })
  // }

  public _execute(msg: JSONRPCRequest) {
    // if (this.nodeId) {
    //   msg.targetNodeId = this.nodeId
    // }
    return this.session.execute(msg)
  }

  // private async _onVertoAttach(params: any) {
  //   if (this.options.simulcast === true) {
  //     console.debug('Handle verto.attach for a simulcast call?', params)
  //   }

  //   // FIXME: need to dispatch a participantData notification??
  //   switch (this.state) {
  //     case CallState.New:
  //       this.session.autoRecoverCalls
  //         ? this.answer()
  //         : this.setState(CallState.Recovering)
  //       break
  //     case CallState.Active: {
  //       if (this.doReinvite) {
  //         console.debug('doReinvite IS ACTIVE!', params)
  //         return logger.warn('>>>> This leg alreay sent a reinvite??')
  //       }
  //       // TODO: force peer.type to be an Answer
  //       this.peer.type = PeerType.Answer
  //       this.options.remoteSdp = params.sdp
  //       const stream = await getUserMedia({ video: true })
  //       stream.getVideoTracks().forEach((t) => {
  //         this.options.localStream.addTrack(t)
  //         this.peer.instance.addTrack(t, this.options.localStream)
  //       })
  //       break
  //     }
  //   }
  // }

  protected _finalize() {
    if (this.peer && this.peer.instance) {
      this.peer.instance.close()
      this.peer = null
    }
    const { remoteStream, localStream } = this.options
    stopStream(remoteStream)
    stopStream(localStream)
    // deRegisterAll(this.id)
  }
}
