import {
  logger,
  VertoBye,
  VertoInfo,
  VertoInvite,
  BaseComponent,
  selectors,
  BaseComponentOptions,
  BaseConnectionState,
  InternalVideoEvent,
  Rooms,
  JSONRPCRequest,
} from '@signalwire/core'
import RTCPeer from './RTCPeer'
import { ConnectionOptions } from './utils/interfaces'
import { stopStream, stopTrack, getUserMedia } from './utils/webrtcHelpers'

const ROOM_EVENTS: InternalVideoEvent[] = [
  'video.room.started',
  'video.room.subscribed',
  'video.room.updated',
  'video.room.ended',
  'video.member.joined',
  'video.member.updated',
  'video.member.left',
  'video.member.talking',
  'video.layout.changed',
  // @ts-expect-error
  'video.recording.started',
  // @ts-expect-error
  'video.recording.updated',
  // @ts-expect-error
  'video.recording.ended',
]

/**
 * Events to be subscribing for screen sharing during
 * `verto.invite`
 */
const SCREENSHARE_ROOM_EVENTS = [
  /**
   * This is not a real event, it's only being used for debugging
   * purposes
   */
  'video.room.screenshare',
]

/**
 * Events to be subscribing for screen sharing during
 * `verto.invite`
 */
const DEVICE_ROOM_EVENTS = [
  /**
   * This is not a real event, it's only being used for debugging
   * purposes
   */
  'video.room.additionaldevice',
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
  additionalDevice: false,
  userVariables: {},
  requestTimeout: 10 * 1000,
  autoApplyMediaParams: true,
  iceGatheringTimeout: 2 * 1000,
}

export type BaseConnectionOptions = ConnectionOptions & BaseComponentOptions
export class BaseConnection
  extends BaseComponent
  implements Rooms.BaseRoomInterface
{
  public nodeId = ''
  public direction: 'inbound' | 'outbound'
  public peer: RTCPeer
  public options: BaseConnectionOptions
  /** @internal */
  public cause: string
  /** @internal */
  public causeCode: string
  /** @internal */
  public gotEarly = false

  /** @internal */
  public doReinvite = false

  /** @internal */
  protected _eventsPrefix = 'video' as const

  private state: BaseConnectionState = 'new'
  private prevState: BaseConnectionState = 'new'

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
    logger.debug('New Call with Options:', this.options)
  }

  get id() {
    return this.__uuid
  }

  get active() {
    return this.state === 'active'
  }

  get trying() {
    return this.state === 'trying'
  }

  get memberId() {
    return this._memberId
  }

  get roomId() {
    return this._roomId
  }

  get roomSessionId() {
    return this._roomSessionId
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
      additionalDevice,
    } = this.options
    return {
      sessid: this.options.sessionid,
      dialogParams: {
        id: this.__uuid,
        destinationNumber,
        attach,
        callerName,
        callerNumber,
        remoteCallerName,
        remoteCallerNumber,
        userVariables,
        screenShare,
        additionalDevice,
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
   * Verto messages have to be wrapped into an execute
   * request and sent using the 'video.message' method.
   */
  public vertoExecute(vertoMessage: JSONRPCRequest) {
    const params: any = {
      message: vertoMessage,
      node_id: this.nodeId,
    }
    if (vertoMessage.method === 'verto.invite') {
      if (this.options.screenShare) {
        params.subscribe = SCREENSHARE_ROOM_EVENTS
      } else if (this.options.additionalDevice) {
        params.subscribe = DEVICE_ROOM_EVENTS
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
    this.nodeId = component.nodeId
    this._roomId = component.roomId
    this._roomSessionId = component.roomSessionId
    this._memberId = component.memberId

    /**
     * For screenShare/additionalDevice we're using
     * the `memberId` to namespace the object.
     **/
    if (this.options.additionalDevice || this.options.screenShare) {
      this._attachListeners(component.memberId)
    } else {
      this._attachListeners(component.roomSessionId)
    }
  }

  /** @internal */
  onVideoConstraints(component: any) {
    logger.debug('onVideoConstraints', component)
    if (component?.videoConstraints) {
      this.peer.applyMediaConstraints('video', component.videoConstraints)
    }
  }

  /** @internal */
  onAudioConstraints(component: any) {
    logger.debug('onAudioConstraints', component)
    if (component?.audioConstraints) {
      this.peer.applyMediaConstraints('audio', component.audioConstraints)
    }
  }

  updateCamera(constraints: MediaTrackConstraints) {
    return this.updateConstraints({
      video: {
        aspectRatio: 16 / 9,
        ...constraints,
      },
    })
  }

  updateMicrophone(constraints: MediaTrackConstraints) {
    return this.updateConstraints({
      audio: constraints,
    })
  }

  /** @internal */
  private manageSendersWithConstraints(constraints: MediaStreamConstraints) {
    if (constraints.audio === false) {
      logger.info('Switching off the microphone')
      this.stopOutboundAudio()
    }

    if (constraints.video === false) {
      logger.info('Switching off the camera')
      this.stopOutboundVideo()
    }

    return constraints.audio || constraints.video
  }

  /**
   * @internal
   */
  private updateConstraints(
    constraints: MediaStreamConstraints
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(
          'updateConstraints trying constraints',
          this.__uuid,
          constraints
        )
        if (!Object.keys(constraints).length) {
          return logger.warn('Invalid constraints:', constraints)
        }

        const shouldContinueWithUpdate =
          this.manageSendersWithConstraints(constraints)

        if (!shouldContinueWithUpdate) {
          logger.debug(
            'Either `video` and `audio` (or both) constraints were set to `false` so their corresponding senders (if any) were stopped'
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

            this.options.localStream.addTrack(newTrack)
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
  invite<T>(): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.direction = 'outbound'
      this.peer = new RTCPeer(this, 'offer')
      try {
        const _resolve = () => resolve(this as any as T)

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
  answer() {
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
      if (
        jsonrpc?.code === '404' ||
        jsonrpc?.cause === 'INVALID_MSG_UNSPECIFIED'
      ) {
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
