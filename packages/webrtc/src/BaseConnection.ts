import {
  VertoBye,
  VertoInfo,
  VertoInvite,
  BaseComponent,
  selectors,
  BaseComponentOptions,
  BaseConnectionState,
  Rooms,
  JSONRPCRequest,
  EventEmitter,
  BaseConnectionContract,
  VertoModify,
} from '@signalwire/core'
import RTCPeer from './RTCPeer'
import { ConnectionOptions } from './utils/interfaces'
import { stopStream, stopTrack, getUserMedia } from './utils/webrtcHelpers'

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

type EventsHandlerMapping = Record<BaseConnectionState, () => void> &
  Record<string, () => void>

export type BaseConnectionStateEventTypes = {
  [k in BaseConnectionState]: EventsHandlerMapping[k]
}

export type BaseConnectionOptions<
  EventTypes extends EventEmitter.ValidEventTypes
> = ConnectionOptions &
  BaseComponentOptions<EventTypes & BaseConnectionStateEventTypes>

export class BaseConnection<EventTypes extends EventEmitter.ValidEventTypes>
  extends BaseComponent<EventTypes & BaseConnectionStateEventTypes>
  implements
    Rooms.BaseRoomInterface<EventTypes & BaseConnectionStateEventTypes>,
    BaseConnectionContract<EventTypes & BaseConnectionStateEventTypes>
{
  public nodeId = ''
  public direction: 'inbound' | 'outbound'
  public peer: RTCPeer<EventTypes>
  public options: BaseConnectionOptions<
    EventTypes & BaseConnectionStateEventTypes
  >
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
  private _previewUrl: string

  constructor(
    options: BaseConnectionOptions<EventTypes & BaseConnectionStateEventTypes>
  ) {
    super(options)

    this.options = {
      ...DEFAULT_CALL_OPTIONS,
      ...options,
    }

    this.setState('new')
    this.logger.debug('New Call with Options:', this.options)

    this.applyEmitterTransforms({ local: true })
    this.attachWorkers()
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

  get previewUrl() {
    return this._previewUrl
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

  get iceServers() {
    return this.options?.iceServers ?? this.select(selectors.getIceServers)
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
  private vertoExecute(vertoMessage: JSONRPCRequest) {
    const params: any = {
      message: vertoMessage,
      node_id: this.nodeId,
    }
    if (vertoMessage.method === 'verto.invite') {
      if (this.options.screenShare) {
        /** Only being used for debugging purposes */
        params.subscribe = ['video.room.screenshare']
      } else if (this.options.additionalDevice) {
        /** Only being used for debugging purposes */
        params.subscribe = ['video.room.additionaldevice']
      } else {
        params.subscribe = this.getSubscriptions()
      }
    } else {
      // nodeId is required for all the requests (except for verto.invite)
      if (!this.nodeId) {
        this.logger.warn(
          `Skip Request. Missing nodeId for '${vertoMessage.method}'.`
        )
        return
      }
    }

    return this.execute({
      method: 'video.message',
      params,
    })
  }

  /** @internal */
  public onStateChange(component: any) {
    this.logger.debug('onStateChange', component)
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
    this.logger.debug('onRemoteSDP', component)
    if (component.remoteSDP) {
      this.peer.onRemoteSdp(component.remoteSDP)
    }
  }

  /** @internal */
  public onRoomSubscribed(component: any) {
    this.logger.debug('onRoomSubscribed', component)
    this.nodeId = component.nodeId
    this._roomId = component.roomId
    this._roomSessionId = component.roomSessionId
    this._memberId = component.memberId
    this._previewUrl = component.previewUrl

    /**
     * For screenShare/additionalDevice we're using
     * the `memberId` to namespace the object.
     **/
    if (this.options.additionalDevice || this.options.screenShare) {
      this._attachListeners(component.memberId)
    } else {
      this._attachListeners(component.roomSessionId)
    }
    // FIXME: Move to a better place when rework _attachListeners too.
    this.applyEmitterTransforms()
  }

  /** @internal */
  onVideoConstraints(component: any) {
    this.logger.debug('onVideoConstraints', component)
    if (component?.videoConstraints) {
      this.peer.applyMediaConstraints('video', component.videoConstraints)
    }
  }

  /** @internal */
  onAudioConstraints(component: any) {
    this.logger.debug('onAudioConstraints', component)
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
      this.logger.info('Switching off the microphone')
      this.stopOutboundAudio()
    }

    if (constraints.video === false) {
      this.logger.info('Switching off the camera')
      this.stopOutboundVideo()
    }

    return constraints.audio || constraints.video
  }

  /**
   * @internal
   */
  private updateConstraints(
    constraints: MediaStreamConstraints,
    { attempt = 0 } = {}
  ): Promise<void> {
    if (attempt > 1) {
      return Promise.reject(new Error('Failed to update constraints'))
    }

    return new Promise(async (resolve, reject) => {
      try {
        if (!Object.keys(constraints).length) {
          return this.logger.warn('Invalid constraints:', constraints)
        }

        this.logger.debug(
          'updateConstraints trying constraints',
          this.__uuid,
          constraints
        )
        const shouldContinueWithUpdate =
          this.manageSendersWithConstraints(constraints)

        if (!shouldContinueWithUpdate) {
          this.logger.debug(
            'Either `video` and `audio` (or both) constraints were set to `false` so their corresponding senders (if any) were stopped'
          )
          return
        }

        let newStream!: MediaStream
        try {
          newStream = await getUserMedia(constraints)
        } catch (error) {
          /**
           * In Firefox you cannot open more than one
           * microphone at a time, per process. When this
           * happens we'll try to do the following:
           * 1. Stop the current audio track
           * 2. Try to get another audio track with the new
           *    constraints
           * 3. If we get an error: restore the media tracks
           *    using the previous constraints.
           * @see
           * https://bugzilla.mozilla.org/show_bug.cgi?id=1238038
           */
          if (
            error instanceof DOMException &&
            error.message === 'Concurrent mic process limit.'
          ) {
            let oldConstraints: MediaStreamConstraints = {}
            this.options.localStream?.getTracks().forEach((track) => {
              /**
               * We'll keep a reference of the original
               * constraints so if something fails we should
               * be able to restore them.
               */
              // @ts-expect-error
              oldConstraints[track.kind] = track.getConstraints()

              // @ts-expect-error
              if (constraints[track.kind] !== undefined) {
                this.logger.debug(
                  'updateConstraints stop old tracks to retrieve new ones'
                )
                stopTrack(track)
                this.options.localStream?.removeTrack(track)
              }
            })

            try {
              return resolve(
                this.updateConstraints(constraints, {
                  attempt: attempt + 1,
                })
              )
            } catch (error) {
              this.logger.error('Restoring previous constraints')
              return resolve(
                this.updateConstraints(oldConstraints, {
                  attempt: attempt + 1,
                })
              )
            }
          }

          this.logger.error('updateConstraints', error)
          return reject(error)
        }

        this.logger.debug('updateConstraints got stream', newStream)
        if (!this.options.localStream) {
          this.options.localStream = new MediaStream()
        }
        const { instance } = this.peer
        const tracks = newStream.getTracks()
        this.logger.debug(`updateConstraints got ${tracks.length} tracks`)
        for (let i = 0; i < tracks.length; i++) {
          const newTrack = tracks[i]
          this.logger.debug('updateConstraints apply track: ', newTrack)
          const transceiver = instance
            .getTransceivers()
            .find(({ mid, sender, receiver }) => {
              if (sender.track && sender.track.kind === newTrack.kind) {
                this.logger.debug('Found transceiver by sender')
                return true
              }
              if (receiver.track && receiver.track.kind === newTrack.kind) {
                this.logger.debug('Found transceiver by receiver')
                return true
              }
              if (mid === null) {
                this.logger.debug('Found disassociated transceiver')
                return true
              }
              return false
            })
          if (transceiver && transceiver.sender) {
            this.logger.debug(
              'updateConstraints got transceiver',
              transceiver.currentDirection,
              transceiver.mid
            )
            await transceiver.sender.replaceTrack(newTrack)
            this.logger.debug('updateConstraints replaceTrack')
            transceiver.direction = 'sendrecv'
            this.logger.debug('updateConstraints set to sendrecv')
            this.options.localStream.getTracks().forEach((track) => {
              if (track.kind === newTrack.kind && track.id !== newTrack.id) {
                this.logger.debug(
                  'updateConstraints stop old track and apply new one - '
                )
                stopTrack(track)
                this.options.localStream?.removeTrack(track)
              }
            })

            this.options.localStream.addTrack(newTrack)
          } else {
            this.logger.debug(
              'updateConstraints no transceiver found. addTrack and start dancing!'
            )
            this.peer.type = 'offer'
            this.doReinvite = true
            this.options.localStream.addTrack(newTrack)
            instance.addTrack(newTrack, this.options.localStream)
          }
          this.logger.debug('updateConstraints simply update mic/cam')
          if (newTrack.kind === 'audio') {
            this.options.micId = newTrack.getSettings().deviceId
          } else if (newTrack.kind === 'video') {
            this.options.camId = newTrack.getSettings().deviceId
          }
        }
        this.logger.debug('updateConstraints done')
        resolve()
      } catch (error) {
        this.logger.error('updateConstraints', error)
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
        await this.peer.start()
        resolve(this as any as T)
      } catch (error) {
        this.logger.error('Invite error', error)
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
        await this.peer.start()
        resolve(this)
      } catch (error) {
        this.logger.error('Answer error', error)
        reject(error)
      }
    })
  }

  /** @internal */
  onLocalSDPReady(localDescription: RTCSessionDescription) {
    const { type, sdp } = localDescription
    const mungedSDP = this._mungeSDP(sdp)
    this.logger.debug('MUNGED SDP \n', `Type: ${type}`, '\n\n', mungedSDP)
    switch (type) {
      case 'offer':
        // If we have a remoteDescription already, send reinvite
        if (this.peer.instance?.remoteDescription) {
          return this.executeUpdateMedia(mungedSDP)
        } else {
          return this.executeInvite(mungedSDP)
        }
      case 'answer':
        this.logger.warn('Unhandled verto.answer')
        // this.executeAnswer()
        break
      default:
        return this.logger.error(
          `Unknown SDP type: '${type}' on call ${this.id}`
        )
    }
  }

  /** @internal */
  async executeInvite(sdp: string) {
    if (this.state !== 'new') {
      /**
       * Something bad happened. Either App logic invoking
       * methods in a wrong order or events are not correct.
       */
      throw new Error(
        `Invalid state: '${this.state}' for connection id: ${this.id}`
      )
    }
    this.setState('requesting')
    try {
      const ssOpts = this.options.screenShare
        ? {
            layout: this.options.layout,
            positions: this.options.positions,
          }
        : {}
      const msg = VertoInvite({
        ...this.messagePayload,
        ...ssOpts,
        sdp,
      })
      const response = await this.vertoExecute(msg)
      this.logger.debug('Invite response', response)
    } catch (error) {
      this.setState('hangup')
      throw error.jsonrpc
    }
  }

  /** @internal */
  async executeUpdateMedia(sdp: string) {
    try {
      const msg = VertoModify({
        ...this.messagePayload,
        sdp,
        action: 'updateMedia',
      })
      const response: any = await this.vertoExecute(msg)
      if (!response.sdp) {
        this.logger.error('UpdateMedia invalid SDP answer', response)
      }

      this.logger.debug('UpdateMedia response', response)
      await this.peer.onRemoteSdp(response.sdp)
    } catch (error) {
      this.logger.error('UpdateMedia error', error)
      // this.setState('hangup')
      throw error.jsonrpc
    }
  }

  async hangup() {
    try {
      const bye = VertoBye(this.messagePayload)
      await this.vertoExecute(bye)
    } catch (error) {
      this.logger.error('Hangup error:', error)
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
    this.logger.debug(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    )

    // @ts-expect-error
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
    if (redirectDestination && this.peer.localSdp) {
      this.logger.debug('Redirect Destination to:', redirectDestination)
      this.nodeId = redirectDestination
      return this.executeInvite(this.peer.localSdp)
    }
    return this.setState('hangup')
  }

  /**
   * Allow to define logic to munge the SDP
   *
   * @internal
   * */
  private _mungeSDP(sdp: string) {
    return sdp
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
