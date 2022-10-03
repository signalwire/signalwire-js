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
  componentSelectors,
} from '@signalwire/core'
import type { ReduxComponent } from '@signalwire/core'
import RTCPeer from './RTCPeer'
import { ConnectionOptions } from './utils/interfaces'
import { stopTrack, getUserMedia } from './utils'
import * as workers from './workers'

interface OnVertoByeParams {
  byeCause: string
  byeCauseCode: string
  rtcPeerId: string
  redirectDestination?: string
}

const INVITE_VERSION = 1000
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}
const AUDIO_CONSTRAINTS_SCREENSHARE: MediaTrackConstraints = {
  ...AUDIO_CONSTRAINTS,
  noiseSuppression: false,
  autoGainControl: false,
  // @ts-expect-error
  googAutoGainControl: false,
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, min: 320 },
  height: { ideal: 720, min: 180 },
  aspectRatio: { ideal: 16 / 9 },
}

const DEFAULT_CALL_OPTIONS: ConnectionOptions = {
  destinationNumber: 'room',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: AUDIO_CONSTRAINTS,
  video: VIDEO_CONSTRAINTS,
  useStereo: false,
  attach: false,
  screenShare: false,
  additionalDevice: false,
  userVariables: {},
  requestTimeout: 10 * 1000,
  autoApplyMediaParams: true,
  iceGatheringTimeout: 2 * 1000,
}

type EventsHandlerMapping = Record<BaseConnectionState, (params: any) => void>

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
  public direction: 'inbound' | 'outbound'
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
  private activeRTCPeerId: string
  private rtcPeerMap = new Map<string, RTCPeer<EventTypes>>()

  constructor(
    options: BaseConnectionOptions<EventTypes & BaseConnectionStateEventTypes>
  ) {
    super(options)

    this.options = {
      ...DEFAULT_CALL_OPTIONS,
      ...options,
    }
    this._checkDefaultMediaConstraints()

    this.setState('new')
    this.logger.debug('New Call with Options:', this.options)

    this.applyEmitterTransforms({ local: true })
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
    // @ts-expect-error
    return this.component.memberId
  }

  get previewUrl() {
    // @ts-expect-error
    return this.component.previewUrl
  }

  get roomId() {
    // @ts-expect-error
    return this.component.roomId
  }

  get roomSessionId() {
    // @ts-expect-error
    return this.component.roomSessionId
  }

  get callId() {
    return this.peer?.uuid || ''
  }

  get localStream() {
    return this.peer?.localStream
  }

  set localStream(stream) {
    if (this.peer) {
      this.peer.localStream = stream
    }
  }

  get remoteStream() {
    return this.peer?.remoteStream
  }

  get iceServers() {
    return this.options?.iceServers ?? this.select(selectors.getIceServers)
  }

  get component(): ReduxComponent {
    return (
      this.select((state) =>
        componentSelectors.getComponent(state, this.callId)
      ) || {}
    )
  }

  /** @internal */
  dialogParams(rtcPeerId: string) {
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
      pingSupported = true,
    } = this.options

    return {
      dialogParams: {
        id: rtcPeerId,
        destinationNumber,
        attach,
        callerName,
        callerNumber,
        remoteCallerName,
        remoteCallerNumber,
        userVariables,
        screenShare,
        additionalDevice,
        pingSupported,
        version: INVITE_VERSION,
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
    return Boolean(this.peer?.hasAudioReceiver)
  }

  /** @internal */
  get withVideo() {
    return Boolean(this.peer?.hasVideoReceiver)
  }

  get localVideoTrack() {
    return this.peer ? this.peer.localVideoTrack : null
  }

  get localAudioTrack() {
    return this.peer ? this.peer.localAudioTrack : null
  }

  get peer() {
    return this.getRTCPeerById(this.activeRTCPeerId)
  }

  set peer(rtcPeer: RTCPeer<EventTypes> | undefined) {
    if (!rtcPeer) {
      this.logger.warn('Invalid RTCPeer', rtcPeer)
      return
    }
    this.logger.debug('Set RTCPeer', rtcPeer.uuid, rtcPeer)
    this.rtcPeerMap.set(rtcPeer.uuid, rtcPeer)

    if (this.peer && this.callId !== rtcPeer.uuid) {
      const oldPeerId = this.peer.uuid
      this.logger.info('>>> Stop old RTCPeer', oldPeerId)
      // Invoke hangup to make sure backend closes
      this.hangup(oldPeerId).then(console.warn).catch(console.error)
      this.peer.detachAndStop()

      // Remove RTCPeer from local cache to stop answering to ping/pong
      // this.rtcPeerMap.delete(oldPeerId)
    }

    this.logger.info('>>> Replace RTCPeer with', rtcPeer.uuid)
    this.activeRTCPeerId = rtcPeer.uuid
  }

  getRTCPeerById(rtcPeerId: string) {
    const rtcPeer = this.rtcPeerMap.get(rtcPeerId)
    // if ('development' === process.env.NODE_ENV && !rtcPeer) {
    //   throw new Error(`Unknown rtcPeerId '${rtcPeerId}'`)
    // }
    return rtcPeer
  }

  appendRTCPeer(rtcPeer: RTCPeer<EventTypes>) {
    return this.rtcPeerMap.set(rtcPeer.uuid, rtcPeer)
  }

  setActiveRTCPeer(rtcPeerId: string) {
    this.peer = this.rtcPeerMap.get(rtcPeerId)
  }

  /**
   * @internal
   * Verto messages have to be wrapped into an execute
   * request and sent using the 'video.message' method.
   */
  private vertoExecute(params: {
    message: JSONRPCRequest
    node_id?: string
    subscribe?: EventEmitter.EventNames<
      EventTypes & BaseConnectionStateEventTypes
    >[]
  }) {
    return this.execute({
      method: 'video.message',
      params,
    })
  }

  /** @internal */
  async _triggerNewRTCPeer() {
    this.logger.debug('_triggerNewRTCPeer Start')
    try {
      this.logger.debug('Build a new RTCPeer')
      const rtcPeer = new RTCPeer(this, 'offer')
      this.appendRTCPeer(rtcPeer)
      this.logger.debug('Run workers for the new RTCPeer', rtcPeer.uuid)
      this.runRTCPeerWorkers(rtcPeer.uuid)
      this.logger.debug('Trigger start for the new RTCPeer!')
      await rtcPeer.start()
    } catch (error) {
      this.logger.error('Error building new RTCPeer to promote/demote', error)
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
        if (!this.peer) {
          return reject(new Error('Invalid RTCPeerConnection.'))
        }
        if (!Object.keys(constraints).length) {
          return reject(new Error('Invalid audio/video constraints.'))
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
            this.localStream?.getTracks().forEach((track) => {
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
                this.localStream?.removeTrack(track)
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
        if (!this.localStream) {
          this.localStream = new MediaStream()
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
            this.localStream.getTracks().forEach((track) => {
              if (track.kind === newTrack.kind && track.id !== newTrack.id) {
                this.logger.debug(
                  'updateConstraints stop old track and apply new one - '
                )
                stopTrack(track)
                this.localStream?.removeTrack(track)
              }
            })

            this.localStream.addTrack(newTrack)
          } else {
            this.logger.debug(
              'updateConstraints no transceiver found. addTrack and start dancing!'
            )
            this.peer.type = 'offer'
            this.doReinvite = true
            this.localStream.addTrack(newTrack)
            instance.addTrack(newTrack, this.localStream)
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

  runRTCPeerWorkers(rtcPeerId: string) {
    this.runWorker('vertoEventWorker', {
      worker: workers.vertoEventWorker,
      initialState: { rtcPeerId },
    })

    const main = !(this.options.additionalDevice || this.options.screenShare)

    if (main) {
      this.runWorker('roomSubscribedWorker', {
        worker: workers.roomSubscribedWorker,
        initialState: { rtcPeerId },
      })

      this.runWorker('promoteDemoteWorker', {
        worker: workers.promoteDemoteWorker,
        initialState: { rtcPeerId },
      })
    }
  }

  /** @internal */
  invite<T>(): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.direction = 'outbound'
      this.peer = new RTCPeer(this, 'offer')
      try {
        this.runRTCPeerWorkers(this.peer.uuid)

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
  onLocalSDPReady(rtcPeer: RTCPeer<EventTypes>) {
    if (!rtcPeer.instance.localDescription) {
      this.logger.error('Missing localDescription', rtcPeer)
      throw new Error('Invalid RTCPeerConnection localDescription')
    }
    const { type, sdp } = rtcPeer.instance.localDescription
    const mungedSDP = this._mungeSDP(sdp)
    this.logger.debug('LOCAL SDP \n', `Type: ${type}`, '\n\n', mungedSDP)
    switch (type) {
      case 'offer':
        // If we have a remoteDescription already, send reinvite
        if (rtcPeer.instance.remoteDescription) {
          return this.executeUpdateMedia(mungedSDP, rtcPeer.uuid)
        } else {
          return this.executeInvite(mungedSDP, rtcPeer.uuid)
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

  /**
   * Send the `verto.invite` only if the state is either `new` or `requesting`
   *   - new: the first time we send out the offer.
   *   - requesting: we received a redirectDestination so need to send it again
   *     specifying nodeId.
   *
   * @internal
   */
  async executeInvite(sdp: string, rtcPeerId: string, nodeId?: string) {
    const rtcPeer = this.getRTCPeerById(rtcPeerId)
    if (!rtcPeer || rtcPeer.instance.remoteDescription) {
      throw new Error(
        `RTCPeer '${rtcPeerId}' already has a remoteDescription. Invalid invite.`
      )
    }
    // Set state to `requesting` only when `new`, otherwise keep it as `requesting`.
    if (this.state === 'new') {
      this.setState('requesting')
    }
    try {
      const ssOpts = this.options.screenShare
        ? {
            layout: this.options.layout,
            positions: this.options.positions,
          }
        : {}
      const message = VertoInvite({
        ...this.dialogParams(rtcPeerId),
        ...ssOpts,
        sdp,
      })
      let subscribe: EventEmitter.EventNames<
        EventTypes & BaseConnectionStateEventTypes
      >[] = []
      if (this.options.screenShare) {
        /** @ts-expect-error - Only being used for debugging purposes */
        subscribe = ['video.room.screenshare']
      } else if (this.options.additionalDevice) {
        /** @ts-expect-error - Only being used for debugging purposes */
        subscribe = ['video.room.additionaldevice']
      } else {
        subscribe = this.getSubscriptions()
      }
      const response = await this.vertoExecute({
        message,
        node_id: nodeId,
        subscribe,
      })
      this.logger.debug('Invite response', response)
    } catch (error) {
      this.setState('hangup')
      throw error.jsonrpc
    }
  }

  /** @internal */
  async executeUpdateMedia(sdp: string, rtcPeerId: string) {
    try {
      const message = VertoModify({
        ...this.dialogParams(rtcPeerId),
        sdp,
        action: 'updateMedia',
      })
      const response: any = await this.vertoExecute({ message })
      if (!response.sdp) {
        this.logger.error('UpdateMedia invalid SDP answer', response)
      }

      this.logger.debug('UpdateMedia response', response)
      if (!this.peer) {
        return this.logger.error('Invalid RTCPeer to updateMedia')
      }
      await this.peer.onRemoteSdp(response.sdp)
    } catch (error) {
      this.logger.error('UpdateMedia error', error)
      // this.setState('hangup')
      throw error.jsonrpc
    }
  }

  async hangup(id?: string) {
    const rtcPeerId = id ?? this.callId
    if (!rtcPeerId) {
      throw new Error('Invalid RTCPeer ID to hangup')
    }

    try {
      const message = VertoBye(this.dialogParams(rtcPeerId))
      await this.vertoExecute({ message })
    } catch (error) {
      this.logger.error('Hangup error:', error)
    } finally {
      if (rtcPeerId !== this.callId) {
        return this.logger.warn(
          'Prevent setState hangup',
          rtcPeerId,
          this.callId
        )
      }
      this.setState('hangup')
    }
  }

  /** @internal */
  dtmf(dtmf: string) {
    const rtcPeerId = this.callId
    if (!rtcPeerId) {
      throw new Error('Invalid RTCPeer ID to send DTMF')
    }
    const message = VertoInfo({ ...this.dialogParams(rtcPeerId), dtmf })
    this.vertoExecute({ message })
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
  updateMediaOptions(options: {
    audio?: boolean
    video?: boolean
    negotiateAudio?: boolean
    negotiateVideo?: boolean
  }) {
    this.logger.debug('updateMediaOptions', { ...options })
    this.options = {
      ...this.options,
      ...options,
    }
    this._checkDefaultMediaConstraints()
  }

  /** @internal */
  public onVertoBye = (params: OnVertoByeParams) => {
    const {
      rtcPeerId,
      byeCause = 'NORMAL_CLEARING',
      byeCauseCode = '16',
      redirectDestination,
    } = params
    this.cause = String(byeCause)
    this.causeCode = String(byeCauseCode)
    const rtcPeer = this.getRTCPeerById(rtcPeerId)
    if (!rtcPeer) {
      return this.logger.warn('Invalid RTCPeer to hangup', params)
    }
    if (redirectDestination && rtcPeer.localSdp) {
      this.logger.debug(
        'Redirect Destination to:',
        redirectDestination,
        'for RTCPeer:',
        rtcPeer.uuid
      )
      // Force nodeId to redirectDestination
      this.executeInvite(rtcPeer.localSdp, rtcPeer.uuid, redirectDestination)
      return
    }

    // Notify RTCPeer for the bad signaling error
    rtcPeer.onRemoteBye({ code: this.causeCode, message: this.cause })

    // Set state to hangup only if the rtcPeer is the current one
    if (this.activeRTCPeerId === rtcPeer?.uuid) {
      this.setState('hangup')
    }
  }

  /**
   * Allow to define logic to munge the SDP
   *
   * @internal
   * */
  private _mungeSDP(sdp: string) {
    // const pattern = /^a=candidate.*/
    // const cleaned =
    //   sdp
    //     .split('\r\n')
    //     .filter((line) => !pattern.test(line))
    //     .join('\r\n') + '\r\n'
    // return cleaned
    return sdp
  }

  /**
   * Always use VIDEO_CONSTRAINTS if video: true
   * Always use AUDIO_CONSTRAINTS (or the SS one) if audio: true
   *
   * @internal
   */
  private _checkDefaultMediaConstraints() {
    if (this.options.video === true) {
      this.options.video = VIDEO_CONSTRAINTS
    }
    if (this.options.audio === true) {
      this.options.audio = this.options.screenShare
        ? AUDIO_CONSTRAINTS_SCREENSHARE
        : AUDIO_CONSTRAINTS
    }
  }

  /** @internal */
  protected _finalize() {
    this.rtcPeerMap.forEach((rtcPeer) => {
      rtcPeer.stop()
    })
    this.rtcPeerMap.clear()

    this.destroy()
  }
}
