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
  actions,
  Task,
  isSATAuth,
  WebRTCMethod,
  // VertoAttach,
  VertoAnswer,
} from '@signalwire/core'
import type { ReduxComponent, VertoModifyResponse } from '@signalwire/core'
import RTCPeer from './RTCPeer'
import {
  ConnectionOptions,
  DisableAudioParams,
  DisableVideoParams,
  EmitDeviceUpdatedEventsParams,
  EnableAudioParams,
  EnableVideoParams,
  UpdateMediaOptionsParams,
} from './utils/interfaces'
import { stopTrack, getUserMedia, streamIsValid } from './utils'
import {
  getOppositeSdpDirection,
  getSdpDirection,
  sdpRemoveLocalCandidates,
} from './utils/sdpHelpers'
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
  maxIceGatheringTimeout: 5 * 1000,
  maxConnectionStateTimeout: 3 * 1000,
  watchMediaPackets: true,
  watchMediaPacketsTimeout: 2 * 1000,
}

export type MediaEvent =
  | 'media.connected'
  | 'media.reconnecting'
  | 'media.disconnected'

type EventsHandlerMapping = Record<BaseConnectionState, (params: any) => void> &
  Record<MediaEvent, () => void>

export type BaseConnectionStateEventTypes = {
  [k in keyof EventsHandlerMapping]: EventsHandlerMapping[k]
}

export type BaseConnectionOptions = ConnectionOptions & BaseComponentOptions

export class BaseConnection<EventTypes extends EventEmitter.ValidEventTypes>
  extends BaseComponent<EventTypes & BaseConnectionStateEventTypes>
  implements
    Rooms.BaseRoomInterface<EventTypes & BaseConnectionStateEventTypes>,
    BaseConnectionContract<EventTypes & BaseConnectionStateEventTypes>
{
  public direction: 'inbound' | 'outbound'
  public options: BaseConnectionOptions
  /** @internal */
  public leaveReason: BaseConnectionContract<EventTypes>['leaveReason'] =
    undefined
  /** @internal */
  public cause: string
  /** @internal */
  public causeCode: string
  /** @internal */
  public gotEarly = false

  /**
   * These promise properties are used to have granular
   * control over when to `resolve` and when to `reject` the
   * `_toggleMedia()` method or the renegotiation process.
   */
  private _renegotiationPromise: Promise<VertoModifyResponse> | null = null
  private _resolveRenegotiationPromise:
    | ((value: VertoModifyResponse) => void)
    | null = null
  private _rejectRenegotiationPromise: ((error: Error) => void) | null = null

  private state: BaseConnectionState = 'new'
  private prevState: BaseConnectionState = 'new'
  private activeRTCPeerId: string
  private rtcPeerMap = new Map<string, RTCPeer<EventTypes>>()
  private sessionAuthTask: Task
  protected resuming = false

  constructor(options: BaseConnectionOptions) {
    super(options)

    this.options = {
      ...DEFAULT_CALL_OPTIONS,
      ...options,
    }
    this._checkDefaultMediaConstraints()

    this.setState('new')
    this.logger.trace('New Call with Options:', this.options)

    this._initPeer()
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

  get nodeId() {
    // @ts-expect-error
    return this.component.nodeId || this.options.nodeId
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
        reattaching: attach,
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

  get withAudio() {
    return Boolean(this.peer?.hasAudioReceiver)
  }

  get withVideo() {
    return Boolean(this.peer?.hasVideoReceiver)
  }

  get localAudioTrack() {
    return this.peer ? this.peer.localAudioTrack : null
  }

  get localVideoTrack() {
    return this.peer ? this.peer.localVideoTrack : null
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

    if (this.peer && this.peer.instance && this.callId !== rtcPeer.uuid) {
      const oldPeerId = this.peer.uuid
      this.logger.debug('>>> Stop old RTCPeer', oldPeerId)
      // Hangup the previous RTCPeer
      this.hangup(oldPeerId).catch(console.error)
      this.peer.detachAndStop()

      // Remove RTCPeer from local cache to stop answering to ping/pong
      // this.rtcPeerMap.delete(oldPeerId)
    }

    this.logger.debug('>>> Replace RTCPeer with', rtcPeer.uuid)
    this.activeRTCPeerId = rtcPeer.uuid
  }

  getRTCPeerById(rtcPeerId: string) {
    return this.rtcPeerMap.get(rtcPeerId)
  }

  appendRTCPeer(rtcPeer: RTCPeer<EventTypes>) {
    return this.rtcPeerMap.set(rtcPeer.uuid, rtcPeer)
  }

  setActiveRTCPeer(rtcPeerId: string) {
    this.peer = this.getRTCPeerById(rtcPeerId)
  }

  setLocalStream(stream: MediaStream): Promise<MediaStream> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.peer || !this.localStream) {
          return reject(new Error('Invalid RTCPeerConnection.'))
        }
        if (!streamIsValid(stream)) {
          return reject(new Error('Invalid stream provided.'))
        }
        const prevAudioTracks = this.localStream.getAudioTracks()
        const newAudioTracks = stream.getAudioTracks()
        if (newAudioTracks.length <= 0) {
          this.logger.info(
            'No audio track found in the stream provided. Audio will be unaffected.'
          )
        } else {
          prevAudioTracks.forEach((track) => {
            stopTrack(track)
            this.localStream?.removeTrack(track)
          })
          newAudioTracks.forEach((track) => {
            this.localStream?.addTrack(track)
          })
        }
        const prevVideoTracks = this.localStream.getVideoTracks()
        const newVideoTracks = stream.getVideoTracks()
        if (newVideoTracks.length <= 0) {
          this.logger.info(
            'No video track found in the stream provided. Video will be unaffected.'
          )
        } else {
          prevVideoTracks.forEach((track) => {
            stopTrack(track)
            this.localStream?.removeTrack(track)
          })
          newVideoTracks.forEach((track) => {
            this.localStream?.addTrack(track)
          })
        }
        await this.updateStream(this.localStream)
        this.logger.debug('setLocalStream done')
        resolve(this.localStream)
      } catch (error) {
        this.logger.error('setLocalStream', error)
        reject(error)
      }
    })
  }

  /**
   * @internal
   * Verto messages have to be wrapped into an execute
   * request and sent using the proper RPC WebRTCMethod.
   */
  private vertoExecute<InputType, OutputType = InputType>(params: {
    message: JSONRPCRequest
    callID?: string
    node_id?: string
    subscribe?: EventEmitter.EventNames<
      EventTypes & BaseConnectionStateEventTypes
    >[]
  }) {
    return this.execute<InputType, OutputType>({
      method: this._getRPCMethod(),
      params,
    })
  }

  /** @internal */
  _getRPCMethod(): WebRTCMethod {
    const authState = this.select(selectors.getAuthState)
    if (authState && isSATAuth(authState)) {
      return 'webrtc.verto'
    }
    return 'video.message'
  }

  /** @internal */
  async _triggerNewRTCPeer() {
    this.logger.debug('_triggerNewRTCPeer Start')
    try {
      this.logger.debug('Build a new RTCPeer')
      const rtcPeer = this._buildPeer('offer')
      this.logger.debug('Trigger start for the new RTCPeer!')
      await rtcPeer.start()
    } catch (error) {
      this.logger.error('Error building new RTCPeer to promote/demote', error)
    }
  }

  updateCamera(constraints: MediaTrackConstraints) {
    return this.applyConstraintsAndRefreshStream({
      video: {
        aspectRatio: 16 / 9,
        ...constraints,
      },
    })
  }

  updateMicrophone(constraints: MediaTrackConstraints) {
    return this.applyConstraintsAndRefreshStream({
      audio: constraints,
    })
  }

  /** @internal */
  private _clearRenegotiationPromise() {
    this._renegotiationPromise = null
    this._resolveRenegotiationPromise = null
    this._rejectRenegotiationPromise = null
  }

  /** @internal */
  public _rejectRenegotiation(error: any) {
    if (this._rejectRenegotiationPromise) {
      this._rejectRenegotiationPromise(error)
      this._clearRenegotiationPromise()
    }
  }

  /** @internal */
  private _getTransceiverDirection(kind: 'video' | 'audio' | string) {
    let direction: RTCRtpTransceiverDirection = 'inactive'

    if (kind === 'audio') {
      if (this.options.audio && this.options.negotiateAudio) {
        direction = 'sendrecv'
      } else if (this.options.audio && !this.options.negotiateAudio) {
        direction = 'sendonly'
      } else if (!this.options.audio && this.options.negotiateAudio) {
        direction = 'recvonly'
      } else {
        direction = 'inactive'
      }
    }
    if (kind === 'video') {
      if (this.options.video && this.options.negotiateVideo) {
        direction = 'sendrecv'
      } else if (this.options.video && !this.options.negotiateVideo) {
        direction = 'sendonly'
      } else if (!this.options.video && this.options.negotiateVideo) {
        direction = 'recvonly'
      } else {
        direction = 'inactive'
      }
    }

    return direction
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

  /** @internal */
  private updateConstraints(
    constraints: MediaStreamConstraints,
    { attempt = 0 } = {}
  ): Promise<MediaStream | void> {
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
          return resolve()
        }

        /**
         * On some devices/browsers you cannot open more than one MediaStream at
         * a time, per process. When this happens we'll try to do the following:
         * 1. Stop the current media tracks
         * 2. Try to get new media tracks with the new constraints
         * 3. If we get an error: restore the media tracks using the previous
         *    constraints.
         * @see
         * https://bugzilla.mozilla.org/show_bug.cgi?id=1238038
         *
         * Instead of just replace the track, force-stop the current one to free
         * up the device
         */

        let oldConstraints: MediaStreamConstraints = {}
        this.localStream?.getTracks().forEach((track) => {
          /**
           * We'll keep a reference of the original constraints so if something
           * fails we should be able to restore them.
           */
          // @ts-expect-error
          oldConstraints[track.kind] = track.getConstraints()

          // @ts-expect-error
          if (constraints[track.kind] !== undefined) {
            this.logger.debug('updateConstraints stop old tracks first?')
            this.logger.debug('Track readyState:', track.kind, track.readyState)
            stopTrack(track)
            track.stop()
            this.localStream?.removeTrack(track)
          }
        })

        let newStream!: MediaStream
        try {
          this.logger.info('updateConstraints with', constraints)
          newStream = await getUserMedia(constraints)
        } catch (error) {
          this.logger.error(
            'Error updating device constraints:',
            error.name,
            error.message,
            error
          )

          this.logger.info('Restoring previous constraints', oldConstraints)
          await this.updateConstraints(oldConstraints, {
            attempt: attempt + 1,
          })

          return reject(error)
        }

        this.logger.debug('updateConstraints done')
        resolve(newStream)
      } catch (error) {
        this.logger.error('updateConstraints', error)
        reject(error)
      }
    })
  }

  /**
   * Updates local tracks and transceivers from the given stream.
   * For each new track, it adds or updates a transceiver and emits updated device events.
   */
  private async updateStream(stream: MediaStream) {
    if (!this.peer) {
      throw new Error('Invalid RTCPeerConnection.')
    }

    try {
      // Store the previous tracks for device.updated events
      const prevVideoTrack = this.localVideoTrack
      const prevAudioTrack = this.localAudioTrack

      this.logger.debug('updateStream got stream', stream)
      if (!this.localStream) {
        this.localStream = new MediaStream()
      }

      const tracks = stream.getTracks()
      this.logger.debug(`updateStream got ${tracks.length} tracks`)

      for (const newTrack of tracks) {
        this.logger.debug('updateStream apply track: ', newTrack)

        // Add or update the transceiver (may trigger renegotiation)
        await this.handleTransceiverForTrack(newTrack)

        // Emit the device.updated events
        this.emitDeviceUpdatedEvents({
          newTrack,
          prevAudioTrack,
          prevVideoTrack,
        })
      }

      this.logger.debug('updateStream done')
    } catch (error) {
      this.logger.error('updateStream error', error)
      throw error
    }
  }

  /**
   * Finds or creates a suitable transceiver for the new track. If an existing transceiver
   * is found, replaces its track if needed and updates its direction. If no transceiver
   * is found, adds a new one, potentially triggering renegotiation.
   */
  private async handleTransceiverForTrack(
    newTrack: MediaStreamTrack
  ): Promise<void> {
    if (!this.peer) {
      return this.logger.error('Invalid RTCPeerConnection.')
    }

    const transceiver = this.peer.instance
      .getTransceivers()
      .find(({ mid, sender, receiver }) => {
        if (sender.track && sender.track.kind === newTrack.kind) return true
        if (receiver.track && receiver.track.kind === newTrack.kind) return true
        if (mid === null) return true
        return false
      })

    if (transceiver) {
      this.logger.debug(
        'handleTransceiverForTrack got transceiver',
        transceiver.currentDirection,
        transceiver.mid
      )

      // Existing transceiver found, replace track if it's different
      if (transceiver.sender.track?.id !== newTrack.id) {
        await transceiver.sender.replaceTrack(newTrack)
        this.logger.debug(
          `handleTransceiverForTrack replaceTrack for ${newTrack.kind}`
        )
      }

      // Update direction if needed
      const newDirection = this._getTransceiverDirection(newTrack.kind)
      if (transceiver.direction !== newDirection) {
        transceiver.direction = newDirection
        this.logger.debug(
          `handleTransceiverForTrack set direction to ${newDirection}`
        )
      }

      // Stop old track and add a new one
      this.replaceOldTrack(newTrack)
    } else {
      this.logger.debug(
        'handleTransceiverForTrack no transceiver found; addTransceiver and start dancing!'
      )

      // No suitable transceiver found, add a new one
      const direction = this._getTransceiverDirection(newTrack.kind)
      this.peer.type = 'offer'
      this.localStream?.addTrack(newTrack)
      this.peer.instance.addTransceiver(newTrack, {
        direction: direction,
        streams: [this.localStream!],
      })
    }
  }

  /**
   * Replaces old tracks of the same kind in the local stream with the new track.
   * Stops and removes the old track, then adds the new one. Also updates related
   * device options and reattaches track listeners.
   */
  private replaceOldTrack(newTrack: MediaStreamTrack) {
    if (!this.peer || !this.localStream) {
      return this.logger.error('Invalid RTCPeerConnection or local stream')
    }

    // Detach listeners because stopTrack will trigger the track ended event
    this.peer._detachAudioTrackListener()
    this.peer._detachVideoTrackListener()

    this.localStream.getTracks().forEach((oldTrack) => {
      if (oldTrack.kind === newTrack.kind && oldTrack.id !== newTrack.id) {
        this.logger.debug('updateStream stop old track and apply new one')
        stopTrack(oldTrack)
        this.localStream?.removeTrack(oldTrack)
      }
    })
    this.localStream.addTrack(newTrack)

    if (newTrack.kind === 'audio') {
      this.options.micId = newTrack.getSettings().deviceId
    }

    if (newTrack.kind === 'video') {
      this.options.camId = newTrack.getSettings().deviceId
    }

    // Attach listeners again
    this.peer._attachAudioTrackListener()
    this.peer._attachVideoTrackListener()
  }

  /**
   * Emits device updated events for audio or video. Uses previously stored
   * track references to indicate what changed between old and new devices.
   */
  private emitDeviceUpdatedEvents({
    newTrack,
    prevAudioTrack,
    prevVideoTrack,
  }: EmitDeviceUpdatedEventsParams) {
    this.logger.debug('updateStream updating device events and options')
    if (newTrack.kind === 'audio') {
      // @ts-expect-error
      this.emit('microphone.updated', {
        previous: {
          deviceId: prevAudioTrack?.id,
          label: prevAudioTrack?.label,
        },
        current: {
          deviceId: newTrack.id,
          label: newTrack.label,
        },
      })
    } else if (newTrack.kind === 'video') {
      // @ts-expect-error
      this.emit('camera.updated', {
        previous: {
          deviceId: prevVideoTrack?.id,
          label: prevVideoTrack?.label,
        },
        current: {
          deviceId: newTrack.id,
          label: newTrack.label,
        },
      })
    }
  }

  /**
   * Applies the given constraints by retrieving a new stream and then uses
   * {@link updateStream} to synchronize local tracks with that new stream.
   */
  private async applyConstraintsAndRefreshStream(
    constraints: MediaStreamConstraints
  ): Promise<void> {
    const newStream = await this.updateConstraints(constraints)
    if (newStream) {
      await this.updateStream(newStream)
    }
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
      this.peer = this._buildPeer('offer')
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
  answer<T>(): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.direction = 'inbound'
      if (!this.peer) {
        this.peer = this._buildPeer('answer')
      }
      try {
        await this.peer.start()
        resolve(this as any as T)
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
        this._watchSessionAuth()
        // If we have a remoteDescription already, send reinvite
        if (!this.resuming && rtcPeer.instance.remoteDescription) {
          return this.executeUpdateMedia(mungedSDP, rtcPeer.uuid)
        } else {
          return this.executeInvite(mungedSDP, rtcPeer.uuid)
        }
      case 'answer':
        return this.executeAnswer(mungedSDP, rtcPeer.uuid)
      default:
        return this.logger.error(
          `Unknown SDP type: '${type}' on call ${this.id}`
        )
    }
  }

  /** @internal */
  _closeWSConnection() {
    this._watchSessionAuth()
    this.store.dispatch(actions.sessionForceCloseAction())
  }

  private _watchSessionAuth() {
    if (this.sessionAuthTask) {
      this.sessionAuthTask.cancel()
    }
    this.sessionAuthTask = this.runWorker('sessionAuthWorker', {
      worker: workers.sessionAuthWorker,
    })
  }

  /** @internal */
  async resume() {
    this.logger.warn(`[resume] Call ${this.id}`)
    if (this.peer?.instance) {
      const { connectionState } = this.peer.instance
      this.logger.debug(
        `[resume] connectionState for ${this.id} is '${connectionState}'`
      )
      if (connectionState !== 'closed') {
        this.resuming = true
        this.peer.restartIce()
      }
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
    if (!rtcPeer || (rtcPeer.instance.remoteDescription && !this.resuming)) {
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
      this.logger.debug('Subscribing to', subscribe)

      const response: any = await this.vertoExecute({
        message,
        callID: rtcPeerId,
        node_id: nodeId ?? this.options.nodeId,
        subscribe,
      })
      this.logger.debug('Invite response', response)

      this.resuming = false
    } catch (error) {
      this.setState('hangup')
      throw error
    }
  }

  /**
   * Send the `verto.answer` only if the state is `new`
   *   - new: the first time we send out the answer.
   * @internal
   */
  async executeAnswer(sdp: string, rtcPeerId: string, nodeId?: string) {
    // Set state to `answering` only when `new`, otherwise keep it as `answering`.
    if (this.state === 'new') {
      this.setState('answering')
    }
    try {
      const message = VertoAnswer({
        ...this.dialogParams(rtcPeerId),
        sdp,
      })
      const response: any = await this.vertoExecute({
        message,
        callID: rtcPeerId,
        node_id: nodeId ?? this.options.nodeId,
        subscribe: this.getSubscriptions(),
      })
      this.logger.debug('Answer response', response)

      this.resuming = false

      /** Call is active so set the RTCPeer */
      this.setActiveRTCPeer(rtcPeerId)
    } catch (error) {
      this.setState('hangup')
      throw error
    }
  }

  /**
   * Send the `verto.modify` when it's an offer and remote is already present
   * It helps in renegotiation.
   * @internal
   */
  async executeUpdateMedia(sdp: string, rtcPeerId: string) {
    try {
      const message = VertoModify({
        ...this.dialogParams(rtcPeerId),
        sdp,
        action: 'updateMedia',
      })
      const response = await this.vertoExecute<VertoModifyResponse>({
        message,
        callID: rtcPeerId,
        node_id: this.nodeId,
      })
      if (!response.sdp) {
        this.logger.error('UpdateMedia invalid SDP answer', response)
      }

      this.logger.debug('UpdateMedia response', response)
      if (!this.peer) {
        return this.logger.error('Invalid RTCPeer to updateMedia')
      }
      await this.peer.onRemoteSdp(response.sdp)

      // Resolve the pending renegotiation promise with the response
      if (this._resolveRenegotiationPromise) {
        this._resolveRenegotiationPromise(response)
        this._clearRenegotiationPromise()
      }
    } catch (error) {
      // Should we hangup when renegotiation fails?
      this.logger.error('UpdateMedia error', error)

      // Reject the pending renegotiation promise
      if (this._rejectRenegotiationPromise) {
        this._rejectRenegotiationPromise(error)
        this._clearRenegotiationPromise()
      }
      throw error
    }
  }

  async hangup(id?: string) {
    const rtcPeerId = id ?? this.callId
    if (!rtcPeerId) {
      throw new Error('Invalid RTCPeer ID to hangup')
    }

    try {
      const message = VertoBye(this.dialogParams(rtcPeerId))
      await this.vertoExecute({
        message,
        callID: rtcPeerId,
        node_id: this.nodeId,
      })
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

  async hangupAll() {
    const rtcPeerId = this.callId
    if (!rtcPeerId) {
      throw new Error('Invalid RTCPeer ID to hangup')
    }

    try {
      const message = VertoBye({
        cause: 'REJECT_ALL',
        causeCode: '825',
        ...this.dialogParams(rtcPeerId),
      })
      await this.vertoExecute({
        message,
        callID: rtcPeerId,
        node_id: this.nodeId,
      })
    } catch (error) {
      this.logger.error('HangupAll error:', error)
    } finally {
      this.setState('hangup')
    }
  }

  async sendDigits(dtmf: string) {
    const rtcPeerId = this.callId
    if (!rtcPeerId) {
      throw new Error('Invalid RTCPeer ID to send DTMF')
    }
    const message = VertoInfo({ ...this.dialogParams(rtcPeerId), dtmf })
    await this.vertoExecute({
      message,
      callID: rtcPeerId,
      node_id: this.nodeId,
    })
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
    this.logger.trace(
      `Call ${this.id} state change from ${this.prevState} to ${this.state}`
    )

    // @ts-expect-error
    this.emitter.emit(this.state, this)

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
  updateMediaOptions(options: UpdateMediaOptionsParams) {
    this.logger.debug('updateMediaOptions', { ...options })
    this.options = {
      ...this.options,
      ...options,
    }
    this._checkDefaultMediaConstraints()
  }

  /** @internal */
  public onVertoBye = (params: OnVertoByeParams) => {
    this.logger.debug('onVertoBye', params)
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
      this.logger.debug('onVertoBye go hangup')
      this.setState('hangup')
    }
  }

  /**
   * Allow to define logic to munge the SDP
   *
   * @internal
   * */
  private _mungeSDP(sdp: string) {
    return sdpRemoveLocalCandidates(sdp)
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

  private _initPeer() {
    // Build only for answer to be able to reject
    if (this.options.remoteSdp) {
      this.peer = this._buildPeer('answer')
    }
  }

  private _buildPeer(type: RTCSdpType) {
    const rtcPeer = new RTCPeer(this, type)
    this.appendRTCPeer(rtcPeer)
    this.runRTCPeerWorkers(rtcPeer.uuid)

    return rtcPeer
  }

  /** @internal */
  protected _finalize() {
    this.rtcPeerMap.forEach((rtcPeer) => {
      rtcPeer.stop()
    })
    this.rtcPeerMap.clear()
  }

  private async _toggleMedia(
    kind: 'audio' | 'video',
    params: {
      enable: boolean | MediaTrackConstraints
      negotiate: boolean
    }
  ) {
    try {
      const { enable, negotiate } = params

      if (!this.peer) {
        throw new Error('Invalid RTCPeerConnection')
      }

      // Check if the peer is already negotiating
      if (this.peer.isNegotiating || this._renegotiationPromise) {
        throw new Error('The peer is already negotiating the media!')
      }

      // Update media options based on the kind
      const mediaOptionsUpdate =
        kind === 'audio'
          ? { audio: enable, negotiateAudio: negotiate }
          : { video: enable, negotiateVideo: negotiate }
      this.updateMediaOptions(mediaOptionsUpdate)

      // No need to negotiate if the requested direction is already set
      const reqDirection = this._getTransceiverDirection(kind)
      const currDirection = getSdpDirection(this.peer.localSdp!, kind)
      if (reqDirection === currDirection) {
        this.logger.info(`The ${kind} media is already in the desired state!`)
        return
      }

      // Create a new renegotiation promise that would be resolved by the executeUpdateMedia
      this._renegotiationPromise = new Promise<any>((resolve, reject) => {
        this._resolveRenegotiationPromise = resolve
        this._rejectRenegotiationPromise = reject
      })

      // Update constraints to start or stop the outbound track
      await this.updateConstraints({ [kind]: enable })

      if (enable) {
        // No need to adjust transceiver when enabling media
        // updateConstraints and updateStream handle this
        return this._renegotiationPromise
      }

      // When disabling media or adding with "recvonly"
      const transceiver = this.peer.instance
        .getTransceivers()
        .find(
          (tr) =>
            tr.receiver.track?.kind === kind || tr.sender.track?.kind === kind
        )

      if (transceiver) {
        if (negotiate) {
          // User wants to keep receiving media; set to 'recvonly'
          transceiver.direction = 'recvonly'
          this.logger.info(`Updated ${kind} transceiver to "recvonly" mode.`)
        } else {
          // User wants to disable media completely; set to 'inactive'
          transceiver.direction = 'inactive'
          this.logger.info(`Updated ${kind} transceiver to "inactive" mode.`)
        }
        // Stop the sender track
        transceiver.sender.track?.stop()
        // TODO: Should we replace the sender's track with null?
      } else {
        // No transceiver exists; add one in 'recvonly' mode
        if (negotiate) {
          // Ensure we act as the offerer when adding the transceiver during renegotiation
          this.peer.type = 'offer'
          this.peer.instance.addTransceiver(kind, { direction: 'recvonly' })
          this.logger.info(`Added ${kind} transceiver in "recvonly" mode.`)
        }
      }

      const result = await this._renegotiationPromise

      // Throw error if the remote SDP does not include the expected direction
      const localDirection = getSdpDirection(this.peer.localSdp!, kind)
      const expectedRemoteDirection = getOppositeSdpDirection(localDirection)
      const remoteDirection = getSdpDirection(this.peer.remoteSdp!, kind)
      if (remoteDirection !== expectedRemoteDirection) {
        throw new Error(
          `The server did not set the ${kind} direction correctly`
        )
        // Should we stop user stream?
      }
      return result
    } catch (error) {
      // Reject the promise if an error occurs
      if (this._rejectRenegotiationPromise) {
        this._rejectRenegotiationPromise(error)
        this._clearRenegotiationPromise()
      }
      throw error
    }
  }

  public async enableAudio(params?: EnableAudioParams) {
    const { audio = true, negotiateAudio = true } = params || {}

    if (!audio && !negotiateAudio) {
      throw new Error(
        'Invalid parameters! At least one of "audio" or "negotiateAudio" must be true.'
      )
    }

    await this._toggleMedia('audio', {
      enable: audio,
      negotiate: negotiateAudio,
    })
  }

  public async disableAudio(params?: DisableAudioParams) {
    const { negotiateAudio = false } = params || {}

    await this._toggleMedia('audio', {
      enable: false,
      negotiate: negotiateAudio,
    })
  }

  public async enableVideo(params?: EnableVideoParams) {
    if (this.peer?.isNegotiating) {
      throw new Error('The peer is already negotiating the media!')
    }

    const { video = true, negotiateVideo = true } = params || {}

    if (!video && !negotiateVideo) {
      throw new Error(
        'Invalid parameters! At least one of "video" or "negotiateVideo" must be true.'
      )
    }

    await this._toggleMedia('video', {
      enable: video,
      negotiate: negotiateVideo,
    })
  }

  public async disableVideo(params?: DisableVideoParams) {
    const { negotiateVideo = false } = params || {}

    await this._toggleMedia('video', {
      enable: false,
      negotiate: negotiateVideo,
    })
  }
}
