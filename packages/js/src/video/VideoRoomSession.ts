import {
  BaseComponentContract,
  BaseConnectionContract,
  connect,
  EventEmitter,
  extendComponent,
  Rooms,
  validateEventsToSubscribe,
  VideoAuthorization,
  VideoLayoutChangedEventParams,
} from '@signalwire/core'
import { BaseConnectionOptions, getSpeakerById } from '@signalwire/webrtc'
import {
  BaseRoomSessionConnection,
  BaseRoomSessionOptions,
} from '../BaseRoomSession'
import {
  RoomSessionDevice,
  RoomSessionDeviceAPI,
  RoomSessionDeviceConnection,
  RoomSessionDeviceEvents,
} from '../RoomSessionDevice'
import * as workers from './workers'
import {
  AddCameraOptions,
  AddDeviceOptions,
  AddMicrophoneOptions,
  CreateScreenShareObjectOptions,
  VideoRoomSessionMethods,
  VideoRoomSessionEvents,
  VideoRoomSessionContract,
  BaseRoomSessionContract,
} from '../utils/interfaces'
import { audioSetSpeakerAction } from '../features/actions'

export interface VideoRoomSession
  extends VideoRoomSessionContract,
    VideoRoomSessionMethods,
    BaseRoomSessionContract,
    BaseConnectionContract<VideoRoomSessionEvents>,
    BaseComponentContract {}

export interface VideoRoomSessionOptions extends BaseRoomSessionOptions {}

export class VideoRoomSessionConnection
  extends BaseRoomSessionConnection<VideoRoomSessionEvents>
  implements VideoRoomSessionContract
{
  private _deviceList = new Set<RoomSessionDevice>()
  private _currentLayoutEvent: VideoLayoutChangedEventParams

  constructor(options: VideoRoomSessionOptions) {
    super(options)

    this.initWorker()
  }

  set currentLayoutEvent(event: VideoLayoutChangedEventParams) {
    this._currentLayoutEvent = event
  }

  get currentLayoutEvent() {
    return this._currentLayoutEvent
  }

  get currentLayout() {
    return this._currentLayoutEvent?.layout
  }

  get currentPosition() {
    return this._currentLayoutEvent?.layout.layers.find(
      (layer) => layer.member_id === this.memberId
    )?.position
  }

  get deviceList() {
    return Array.from(this._deviceList)
  }

  get interactivityMode() {
    return this.select(({ session }) => {
      const { authState } = session
      return (authState as VideoAuthorization)?.join_as ?? ''
    })
  }

  get permissions() {
    return this.select(({ session }) => {
      const { authState } = session
      return (authState as VideoAuthorization)?.room?.scopes ?? []
    })
  }

  private initWorker() {
    this.runWorker('videoWorker', {
      worker: workers.videoWorker,
    })
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map((event) => {
      return `video.${String(event)}`
    })
    return validateEventsToSubscribe(
      eventNamesWithPrefix
    ) as EventEmitter.EventNames<{}>[]
  }

  /** @internal */
  protected _finalize() {
    this._deviceList.clear()

    super._finalize()
  }

  /** @internal */
  override async hangup(id?: string) {
    this._deviceList.forEach((device) => {
      device.leave()
    })

    return super.hangup(id)
  }

  join() {
    return super.invite<VideoRoomSessionContract>()
  }

  leave() {
    return this.hangup()
  }

  /**
   * @deprecated Use {@link getLayouts} instead. `getLayoutList` will
   * be removed in v3.0.0
   */
  getLayoutList() {
    // @ts-expect-error
    return this.getLayouts()
  }

  /**
   * @deprecated Use {@link getMembers} instead. `getMemberList` will
   * be removed in v3.0.0
   */
  getMemberList() {
    // @ts-expect-error
    return this.getMembers()
  }

  /** @deprecated Use {@link startScreenShare} instead. */
  async createScreenShareObject(opts: CreateScreenShareObjectOptions = {}) {
    return this.startScreenShare(opts)
  }

  /**
   * Allow to add a camera to the room.
   */
  addCamera(opts: AddCameraOptions = {}) {
    const { autoJoin = true, ...video } = opts
    return this.addDevice({
      autoJoin,
      video,
    })
  }

  /**
   * Allow to add a microphone to the room.
   */
  addMicrophone(opts: AddMicrophoneOptions = {}) {
    const { autoJoin = true, ...audio } = opts
    return this.addDevice({
      autoJoin,
      audio,
    })
  }

  /**
   * Allow to add additional devices to the room like cameras or microphones.
   */
  async addDevice(opts: AddDeviceOptions = {}) {
    return new Promise<RoomSessionDevice>(async (resolve, reject) => {
      const { autoJoin = true, audio = false, video = false } = opts
      if (!audio && !video) {
        throw new TypeError(
          'At least one of `audio` or `video` must be requested.'
        )
      }

      const options: BaseConnectionOptions = {
        ...this.options,
        localStream: undefined,
        remoteStream: undefined,
        audio,
        video,
        additionalDevice: true,
        recoverCall: false,
        userVariables: {
          ...(this.options?.userVariables || {}),
          memberCallId: this.callId,
          memberId: this.memberId,
        },
      }

      const roomDevice = connect<
        RoomSessionDeviceEvents,
        RoomSessionDeviceConnection,
        RoomSessionDevice
      >({
        store: this.store,
        Component: RoomSessionDeviceAPI,
      })(options)

      roomDevice.once('destroy', () => {
        roomDevice.emit('room.left')
        this._deviceList.delete(roomDevice)
      })

      try {
        roomDevice.runWorker('childMemberJoinedWorker', {
          worker: workers.childMemberJoinedWorker,
          onDone: () => resolve(roomDevice),
          onFail: reject,
          initialState: {
            parentId: this.memberId,
          },
        })

        this._deviceList.add(roomDevice)
        if (autoJoin) {
          return await roomDevice.join()
        }
        return resolve(roomDevice)
      } catch (error) {
        this.logger.error('RoomDevice Error', error)
        reject(error)
      }
    })
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    const prevId = this.audioEl.sinkId as string
    this.once(
      // @ts-expect-error
      `${LOCAL_EVENT_PREFIX}.speaker.updated`,
      async (newId: string) => {
        const prevSpeaker = await getSpeakerById(prevId)
        const newSpeaker = await getSpeakerById(newId)

        const isSame = newSpeaker?.deviceId === prevSpeaker?.deviceId
        if (!newSpeaker?.deviceId || isSame) return

        this.emit('speaker.updated', {
          previous: {
            deviceId: prevSpeaker?.deviceId,
            label: prevSpeaker?.label,
          },
          current: {
            deviceId: newSpeaker.deviceId,
            label: newSpeaker.label,
          },
        })
      }
    )

    return this.triggerCustomSaga<undefined>(audioSetSpeakerAction(deviceId))
  }
}

export const VideoRoomSessionAPI = extendComponent<
  VideoRoomSessionConnection,
  VideoRoomSessionMethods
>(VideoRoomSessionConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setOutputVolume: Rooms.setOutputVolumeMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  removeAllMembers: Rooms.removeAllMembers,
  getMembers: Rooms.getMembers,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
  setPositions: Rooms.setPositions,
  setMemberPosition: Rooms.setMemberPosition,
  hideVideoMuted: Rooms.hideVideoMuted,
  showVideoMuted: Rooms.showVideoMuted,
  getRecordings: Rooms.getRecordings,
  startRecording: Rooms.startRecording,
  getPlaybacks: Rooms.getPlaybacks,
  play: Rooms.play,
  setHideVideoMuted: Rooms.setHideVideoMuted,
  getMeta: Rooms.getMeta,
  setMeta: Rooms.setMeta,
  updateMeta: Rooms.updateMeta,
  deleteMeta: Rooms.deleteMeta,
  getMemberMeta: Rooms.getMemberMeta,
  setMemberMeta: Rooms.setMemberMeta,
  updateMemberMeta: Rooms.updateMemberMeta,
  deleteMemberMeta: Rooms.deleteMemberMeta,
  promote: Rooms.promote,
  demote: Rooms.demote,
  getStreams: Rooms.getStreams,
  startStream: Rooms.startStream,
  lock: Rooms.lock,
  unlock: Rooms.unlock,
  setRaisedHand: Rooms.setRaisedHand,
  setPrioritizeHandraise: Rooms.setPrioritizeHandraise,
})

/** @internal */
export const createVideoRoomSessionObject = (
  params: VideoRoomSessionOptions
): VideoRoomSession => {
  const room = connect<
    VideoRoomSessionEvents,
    VideoRoomSessionConnection,
    VideoRoomSession
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: VideoRoomSessionAPI,
  })(params)

  return room
}
