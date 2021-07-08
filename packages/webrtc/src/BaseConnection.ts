import {
  logger,
  VertoBye,
  VertoInfo,
  VertoInvite,
  BaseComponent,
  VertoMethod,
  RoomMethod,
  selectors,
  BaseComponentOptions,
  BaseConnectionState,
} from '@signalwire/core'
import RTCPeer from './RTCPeer'
import {
  enableAudioTracks,
  disableAudioTracks,
  toggleAudioTracks,
  enableVideoTracks,
  disableVideoTracks,
  toggleVideoTracks,
} from './utils/helpers'
import { ConnectionOptions } from './utils/interfaces'
import { stopStream, stopTrack, getUserMedia } from './utils/webrtcHelpers'

const ROOM_EVENTS = [
  'room.started',
  'room.subscribed',
  'room.updated',
  'room.ended',
  'member.joined',
  'member.updated',
  'member.left',
  'member.talking',
  'layout.changed',
]

/**
 * Events to be subscribing for screen sharing during
 * `VertoMethod.Invite`
 */
const SCREENSHARE_ROOM_EVENTS = [
  /**
   * This is not a real event, it's only being used for debugging
   * purposes
   */
  'room.screenshare',
]

const DEFAULT_CALL_OPTIONS: ConnectionOptions = {
  destinationNumber: 'room',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: true,
  video: { aspectRatio: 16 / 9 },
  useStereo: false,
  attach: false,
  screenShare: false,
  secondSource: false,
  userVariables: {},
  requestTimeout: 10 * 1000,
  autoApplyMediaParams: true,
  iceGatheringTimeout: 2 * 1000,
}

interface MemberCommandParams {
  memberId?: string
}
interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}
export type BaseConnectionOptions = ConnectionOptions & BaseComponentOptions
export class BaseConnection extends BaseComponent {
  public nodeId = ''
  public direction: 'inbound' | 'outbound'
  public peer: RTCPeer
  public options: BaseConnectionOptions
  public cause: string
  public causeCode: string
  /** @internal */
  public gotEarly = false

  /** @internal */
  public doReinvite = false

  private state: BaseConnectionState = 'new'
  private prevState: BaseConnectionState = 'new'

  private _extension: string
  // @ts-ignore
  private _roomId: string
  private _roomSessionId: string
  private _memberId: string

  constructor(options: BaseConnectionOptions) {
    super(options)

    const iceServers =
      options?.iceServers ?? this.select(selectors.getIceServers)

    this.options = {
      ...DEFAULT_CALL_OPTIONS,
      ...options,
      iceServers,
    }

    this.setState('new')
    logger.info('New Call with Options:', this.options)
  }

  get active() {
    return this.state === 'active'
  }

  get trying() {
    return this.state === 'trying'
  }

  get extension() {
    return this._extension || this.options.destinationNumber || ''
  }

  set extension(extension: string) {
    this._extension = extension
  }

  get memberId() {
    return this._memberId
  }

  get localStream() {
    return this.options.localStream
  }

  get remoteStream() {
    return this.options.remoteStream
  }

  /** @internal */
  get messagePayload() {
    const {
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
        id: this.id,
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

  /** @internal */
  get withAudio() {
    // TODO: use peer to check audio tracks
    return this.remoteStream
      ? this.remoteStream.getAudioTracks().length > 0
      : false
  }

  /** @internal */
  get withVideo() {
    // TODO: use peer to check video tracks
    return this.remoteStream
      ? this.remoteStream.getVideoTracks().length > 0
      : false
  }

  get localVideoTrack() {
    return this.peer.localVideoTrack
  }

  get localAudioTrack() {
    return this.peer.localAudioTrack
  }

  /**
   * @internal
   * Verto messages have to be wrapped into a blade.execute
   * request and sent using the 'video.message' method.
   */
  public vertoExecute(vertoMessage: any) {
    const params: any = {
      message: vertoMessage,
      node_id: this.nodeId,
    }
    if (vertoMessage.method === VertoMethod.Invite) {
      if (this.options.screenShare) {
        params.subscribe = SCREENSHARE_ROOM_EVENTS
      } else {
        params.subscribe = ROOM_EVENTS
      }
    }

    return this.execute({
      method: 'video.message',
      params,
    })
  }

  /** @internal */
  public onStateChange(component: any) {
    logger.debug('onStateChange', component)
    switch (component.state) {
      case 'hangup':
        this._hangup(component)
        break
      default:
        this.setState(component.state)
        break
    }
  }

  /** @internal */
  public onRemoteSDP(component: any) {
    logger.debug('onRemoteSDP', component)
    if (component.remoteSDP) {
      this.peer.onRemoteSdp(component.remoteSDP)
    }
  }

  /** @internal */
  public onRoomSubscribed(component: any) {
    logger.debug('onRoomSubscribed', component)
    this._roomId = component.roomId
    this._roomSessionId = component.roomSessionId
    this._memberId = component.memberId
    this._attachListeners(component.roomSessionId)
  }

  /**
   * TODO: This is just needed for `screenShareObj`'s. We're using
   * this to namespace that object with `nodeId`
   * @internal
   **/
  public onNodeId(component: any) {
    this._attachListeners(component.nodeId)
  }

  /** @internal */
  updateCamera(deviceId: string): Promise<void> {
    if (typeof deviceId !== 'string') {
      throw new Error('Invalid deviceId')
    }

    return this.updateCameraContraints({ deviceId: { exact: deviceId } })
  }

  /** @internal */
  updateCameraContraints(
    constraints: boolean | MediaTrackConstraints
  ): Promise<void> {
    const c: MediaStreamConstraints = {
      video: constraints,
    }

    return this.updateConstraints(c)
  }

  /** @internal */
  updateMicrophone(deviceId: string): Promise<void> {
    if (typeof deviceId !== 'string') {
      throw new Error('Invalid deviceId')
    }

    return this.updateMicrophoneConstraints({ deviceId: { exact: deviceId } })
  }

  /** @internal */
  updateMicrophoneConstraints(
    constraints: boolean | MediaTrackConstraints
  ): Promise<void> {
    const c: MediaStreamConstraints = {
      audio: constraints,
    }

    return this.updateConstraints(c)
  }

  /** @internal */
  private manageSendersWithContraints(constraints: MediaStreamConstraints) {
    if (constraints.audio === false) {
      logger.info('manageSendersWithContraints Audio outbound stopped')
      this.stopOutboundAudio()
    }

    if (constraints.video === false) {
      logger.info('manageSendersWithContraints Video outbound stopped')
      this.stopOutboundVideo()
    }

    return constraints.audio || constraints.video
  }

  /**
   * TODO: Evaluate if we should make this method private.
   * @internal
   */
  updateConstraints(constraints: MediaStreamConstraints): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(
          'updateConstraints trying constraints',
          this.id,
          constraints
        )
        if (!Object.keys(constraints).length) {
          return logger.warn('Invalid constraints:', constraints)
        }

        const shouldContinueWithUpdate = this.manageSendersWithContraints(
          constraints
        )

        if (!shouldContinueWithUpdate) {
          logger.debug(
            'Either `video` and `audio` (or both) contraints were set to `false` so their corresponding senders (if any) were stopped'
          )
          return
        }

        const newStream = await getUserMedia(constraints)
        logger.debug('updateConstraints got stream', newStream)
        if (!this.options.localStream) {
          this.options.localStream = new MediaStream()
        }
        const { instance } = this.peer
        const tracks = newStream.getTracks()
        for (let i = 0; i < tracks.length; i++) {
          const newTrack = tracks[i]
          logger.debug('updateConstraints apply track: ', newTrack)
          const transceiver = instance
            .getTransceivers()
            .find(({ mid, sender, receiver }) => {
              if (sender.track && sender.track.kind === newTrack.kind) {
                logger.debug('Found transceiver by sender')
                return true
              }
              if (receiver.track && receiver.track.kind === newTrack.kind) {
                logger.debug('Found transceiver by receiver')
                return true
              }
              if (mid === null) {
                logger.debug('Found disassociated transceiver')
                return true
              }
              return false
            })
          if (transceiver && transceiver.sender) {
            logger.debug(
              'updateConstraints FOUND - replaceTrack on it and on localStream'
            )
            await transceiver.sender.replaceTrack(newTrack)
            this.options.localStream.addTrack(newTrack)
            logger.debug('updateConstraints replaceTrack SUCCESS')
            this.options.localStream.getTracks().forEach((track) => {
              if (track.kind === newTrack.kind && track.id !== newTrack.id) {
                logger.debug(
                  'updateConstraints stop old track and apply new one - '
                )
                stopTrack(track)
                this.options.localStream?.removeTrack(track)
              }
            })
          } else {
            logger.debug(
              'updateConstraints NOT FOUND - addTrack and start dancing!'
            )
            this.peer.type = 'offer'
            this.doReinvite = true
            this.options.localStream.addTrack(newTrack)
            instance.addTrack(newTrack, this.options.localStream)
          }
          logger.debug('updateConstraints Simply update mic/cam')
          if (newTrack.kind === 'audio') {
            this.options.micId = newTrack.getSettings().deviceId
          } else if (newTrack.kind === 'video') {
            this.options.camId = newTrack.getSettings().deviceId
          }
        }
        logger.debug('updateConstraints done!')
        resolve()
      } catch (error) {
        logger.error('updateConstraints', error)
        reject(error)
      }
    })
  }

  /** @internal */
  invite() {
    return new Promise(async (resolve, reject) => {
      this.direction = 'outbound'
      this.peer = new RTCPeer(this, 'offer')
      try {
        const _resolve = () => resolve(this)

        this.once('active', () => {
          this.off('destroy', _resolve)
          _resolve()
        })
        this.once('destroy', _resolve)
        await this.peer.start()
      } catch (error) {
        logger.error('Join error', error)
        reject(error)
      }
    })
  }

  /** @internal */
  async answer() {
    return new Promise(async (resolve, reject) => {
      this.direction = 'inbound'
      this.peer = new RTCPeer(this, 'answer')
      try {
        const _resolve = () => resolve(this)

        this.once('active', () => {
          this.off('destroy', _resolve)
          _resolve()
        })
        this.once('destroy', _resolve)
        await this.peer.start()
      } catch (error) {
        logger.error('Answer error', error)
        reject(error)
      }
    })
  }

  /** @internal */
  onLocalSDPReady(localDescription: RTCSessionDescription) {
    const { type, sdp } = localDescription
    switch (type) {
      case 'offer':
        // if (this.active) {
        //   this.executeUpdateMedia()
        // } else {
        this.executeInvite(sdp)
        // }
        break
      case 'answer':
        logger.warn('Unhandled verto.answer')
        // this.executeAnswer()
        break
      default:
        return logger.error(`Unknown SDP type: '${type}' on call ${this.id}`)
    }
  }

  /** @internal */
  async executeInvite(sdp: string) {
    this.setState('requesting')
    try {
      const msg = VertoInvite({ ...this.messagePayload, sdp })
      const response = await this.vertoExecute(msg)
      logger.debug('Invite response', response)
    } catch (error) {
      const { action, jsonrpc } = error
      logger.error('Invite Error', jsonrpc, action)
      if (jsonrpc?.code === '404') {
        this.setState('hangup')
      }
    }
  }

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

  /** @internal */
  dtmf(dtmf: string) {
    const msg = VertoInfo({ ...this.messagePayload, dtmf })
    this.vertoExecute(msg)
  }

  /** @internal */
  disableOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && disableAudioTracks(this.options.localStream)
  }

  /** @internal */
  enableOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && enableAudioTracks(this.options.localStream)
  }

  /** @internal */
  toggleOutboundAudio() {
    // TODO: Use peer method
    this.options.localStream && toggleAudioTracks(this.options.localStream)
  }

  /** @internal */
  disableOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && disableVideoTracks(this.options.localStream)
  }

  /** @internal */
  enableOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && enableVideoTracks(this.options.localStream)
  }

  /** @internal */
  toggleOutboundVideo() {
    // TODO: Use peer method
    this.options.localStream && toggleVideoTracks(this.options.localStream)
  }

  /**
   * Deaf
   * @internal
   */
  disableInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && disableAudioTracks(this.options.remoteStream)
  }

  /**
   * Undeaf
   * @internal
   */
  enableInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && enableAudioTracks(this.options.remoteStream)
  }

  /**
   * Toggle Deaf
   * @internal
   */
  toggleInboundAudio() {
    // TODO: Use peer method
    this.options.remoteStream && toggleAudioTracks(this.options.remoteStream)
  }

  /** @internal */
  doReinviteWithRelayOnly() {
    if (this.peer && this.active) {
      this.peer.restartIceWithRelayOnly()
    }
  }

  /** @internal */
  stopOutboundAudio() {
    if (this.peer && this.active) {
      this.peer.stopTrackSender('audio')
    }
  }

  /** @internal */
  restoreOutboundAudio() {
    if (this.peer && this.active) {
      this.peer.restoreTrackSender('audio')
    }
  }

  /** @internal */
  stopOutboundVideo() {
    if (this.peer && this.active) {
      this.peer.stopTrackSender('video')
    }
  }

  /** @internal */
  restoreOutboundVideo() {
    if (this.peer && this.active) {
      this.peer.restoreTrackSender('video')
    }
  }

  /** @internal */
  setState(state: BaseConnectionState) {
    this.prevState = this.state
    this.state = state
    logger.debug(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    )

    this.emit(this.state, this)

    switch (state) {
      case 'purge': {
        this._finalize()
        break
      }
      case 'hangup': {
        this.setState('destroy')
        break
      }
      case 'destroy':
        this._finalize()
        break
    }
  }

  public getLayoutList() {
    return this.execute({
      method: 'video.list_available_layouts',
      params: {
        room_session_id: this._roomSessionId,
      },
    })
  }

  public setLayout({ name }: { name: string }) {
    return this.execute({
      method: 'video.set_layout',
      params: {
        room_session_id: this._roomSessionId,
        name,
      },
    })
  }

  public hideVideoMuted() {
    return this.execute({
      method: 'video.hide_video_muted',
      params: {
        room_session_id: this._roomSessionId,
      },
    })
  }

  public showVideoMuted() {
    return this.execute({
      method: 'video.show_video_muted',
      params: {
        room_session_id: this._roomSessionId,
      },
    })
  }

  public audioMute({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.audio_mute',
      memberId,
    })
  }

  public audioUnmute({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.audio_unmute',
      memberId,
    })
  }

  public videoMute({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.video_mute',
      memberId,
    })
  }

  public videoUnmute({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.video_unmute',
      memberId,
    })
  }

  public deaf({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.deaf',
      memberId,
    })
  }

  public undeaf({ memberId }: MemberCommandParams = {}) {
    return this._memberCommand({
      method: 'video.member.undeaf',
      memberId,
    })
  }

  public setSpeakerVolume({ memberId, volume }: MemberCommandWithVolumeParams) {
    return this._memberCommand({
      method: 'video.member.set_input_volume',
      memberId,
      volume: +volume,
    })
  }

  public setMicrophoneVolume({
    memberId,
    volume,
  }: MemberCommandWithVolumeParams) {
    return this._memberCommand({
      method: 'video.member.set_output_volume',
      memberId,
      volume: +volume,
    })
  }

  public setInputSensitivity({
    memberId,
    value,
  }: MemberCommandWithValueParams) {
    return this._memberCommand({
      method: 'video.member.set_input_sensitivity',
      memberId,
      value: +value,
    })
  }

  public removeMember({ memberId }: Required<MemberCommandParams>) {
    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this._memberCommand({
      method: 'video.member.remove',
      memberId,
    })
  }

  private _memberCommand({
    method,
    memberId,
    ...rest
  }: {
    method: RoomMethod
    memberId?: string
    [key: string]: unknown
  }) {
    return this.execute({
      method,
      params: {
        room_session_id: this._roomSessionId,
        member_id: memberId || this._memberId,
        ...rest,
      },
    })
  }

  /** @internal */
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
    return this.setState('hangup')
  }

  /** @internal */
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
