import {
  connect,
  Rooms,
  EventTransform,
  extendComponent,
  BaseComponentContract,
  BaseComponentOptions,
  BaseConnectionContract,
  toLocalEvent,
  toExternalJSON,
  VideoRoomEventParams,
  MemberPosition,
  VideoRoomSubscribedEventParams,
  VideoAuthorization,
} from '@signalwire/core'
import {
  getDisplayMedia,
  BaseConnection,
  BaseConnectionOptions,
  BaseConnectionStateEventTypes,
} from '@signalwire/webrtc'
import type {
  RoomSessionObjectEvents,
  CreateScreenShareObjectOptions,
  AddDeviceOptions,
  AddCameraOptions,
  AddMicrophoneOptions,
  BaseRoomInterface,
  RoomMethods,
  StartScreenShareOptions,
  RoomSessionConnectionContract,
  BaseRoomSessionJoinParams,
} from './utils/interfaces'
import {
  ROOM_COMPONENT_LISTENERS,
  SCREENSHARE_AUDIO_CONSTRAINTS,
} from './utils/constants'
import { audioSetSpeakerAction } from './features/actions'
import {
  RoomSessionScreenShareAPI,
  RoomSessionScreenShareConnection,
  RoomSessionScreenShare,
  RoomSessionScreenShareEvents,
} from './RoomSessionScreenShare'
import {
  RoomSessionDeviceAPI,
  RoomSessionDeviceConnection,
  RoomSessionDevice,
  RoomSessionDeviceEvents,
} from './RoomSessionDevice'
import * as workers from './video/workers'

export interface BaseRoomSession<T>
  extends RoomMethods,
    RoomSessionConnectionContract,
    BaseComponentContract,
    BaseConnectionContract<RoomSessionObjectEvents> {
  /**
   * Joins the room session.
   */
  join(options?: BaseRoomSessionJoinParams): Promise<T>

  /**
   * Leaves the room. This detaches all the locally originating streams from the
   * room.
   */
  leave(): Promise<void>
}

export class RoomSessionConnection
  extends BaseConnection<RoomSessionObjectEvents>
  implements BaseRoomInterface, RoomSessionConnectionContract
{
  private _screenShareList = new Set<RoomSessionScreenShare>()
  private _deviceList = new Set<RoomSessionDevice>()

  get screenShareList() {
    return Array.from(this._screenShareList)
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

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<string | string[], EventTransform>([
      [
        ['video.room.joined'],
        {
          type: 'roomSession',
          instanceFactory: () => {
            return {}
          },
          payloadTransform: (payload: VideoRoomSubscribedEventParams) => {
            return payload
          },
          nestedFieldsToProcess: {
            recordings: {
              eventTransformType: 'roomSessionRecording',
              processInstancePayload: (payload) => ({ recording: payload }),
            },
            playbacks: {
              eventTransformType: 'roomSessionPlayback',
              processInstancePayload: (payload) => ({ playback: payload }),
            },
            streams: {
              eventTransformType: 'roomSessionStream',
              processInstancePayload: (payload) => ({ stream: payload }),
            },
          },
        },
      ],
      [
        [toLocalEvent('video.recording.list')],
        {
          type: 'roomSessionRecordingList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            recordings: {
              eventTransformType: 'roomSessionRecording',
              processInstancePayload: (payload) => ({ recording: payload }),
            },
          },
        },
      ],
      [
        [toLocalEvent('video.playback.list')],
        {
          type: 'roomSessionPlaybackList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            playbacks: {
              eventTransformType: 'roomSessionPlayback',
              processInstancePayload: (payload) => ({ playback: payload }),
            },
          },
        },
      ],
      [
        [
          toLocalEvent('video.recording.start'),
          'video.recording.started',
          'video.recording.updated',
          'video.recording.ended',
        ],
        {
          type: 'roomSessionRecording',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionRecordingObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.recording,
              room_session_id: this.roomSessionId,
            })
          },
        },
      ],
      [
        [
          toLocalEvent('video.playback.start'),
          'video.playback.started',
          'video.playback.updated',
          'video.playback.ended',
        ],
        {
          type: 'roomSessionPlayback',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionPlaybackObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.playback,
              room_session_id: this.roomSessionId,
            })
          },
        },
      ],
      [
        [toLocalEvent('video.stream.list')],
        {
          type: 'roomSessionStreamList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            streams: {
              eventTransformType: 'roomSessionStream',
              processInstancePayload: (payload) => {
                return { stream: payload }
              },
            },
          },
        },
      ],
      [
        [
          toLocalEvent('video.stream.start'),
          'video.stream.started',
          'video.stream.ended',
        ],
        {
          type: 'roomSessionStream',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionStreamObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.stream,
              room_session_id: this.roomSessionId,
            })
          },
        },
      ],
    ])
  }

  /** @internal */
  protected override getCompoundEvents() {
    return new Map<any, any>([
      ...MemberPosition.MEMBER_POSITION_COMPOUND_EVENTS,
    ])
  }

  /**
   * This method will be called by `join()` right before the
   * `connect()` happens and it's a way for us to control
   * exactly when the workers are attached.
   * @internal
   */
  protected attachPreConnectWorkers() {
    this.runWorker('memberListUpdated', {
      worker: workers.memberListUpdatedWorker,
    })
  }

  /**
   * This method will be called right after
   * `room.subscribed` happened
   * @internal
   */
  protected attachOnSubscribedWorkers(payload: VideoRoomEventParams) {
    this.runWorker('memberPositionWorker', {
      worker: workers.memberPositionWorker,
      initialState: payload,
    })
  }

  /** @deprecated Use {@link startScreenShare} instead. */
  async createScreenShareObject(opts: CreateScreenShareObjectOptions = {}) {
    return this.startScreenShare(opts)
  }

  /**
   * Allow sharing the screen within the room.
   */
  async startScreenShare(opts: StartScreenShareOptions = {}) {
    const {
      autoJoin = true,
      audio = false,
      video = true,
      layout,
      positions,
    } = opts
    const displayStream: MediaStream = await getDisplayMedia({
      audio: audio === true ? SCREENSHARE_AUDIO_CONSTRAINTS : audio,
      video,
    })
    const options: BaseConnectionOptions<RoomSessionObjectEvents> = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      localStream: displayStream,
      remoteStream: undefined,
      userVariables: {
        ...(this.options?.userVariables || {}),
        memberCallId: this.callId,
        memberId: this.memberId,
      },
      layout,
      positions,
    }

    const screenShare = connect<
      RoomSessionScreenShareEvents,
      RoomSessionScreenShareConnection,
      RoomSessionScreenShare
    >({
      store: this.store,
      Component: RoomSessionScreenShareAPI,
      componentListeners: ROOM_COMPONENT_LISTENERS,
    })(options)

    /**
     * Hangup if the user stop the screenShare from the
     * native browser button or if the videoTrack ends.
     */
    displayStream.getVideoTracks().forEach((t) => {
      t.addEventListener('ended', () => {
        if (screenShare && screenShare.active) {
          screenShare.leave()
        }
      })
    })

    screenShare.once('destroy', () => {
      // @ts-expect-error
      screenShare.emit('room.left')
      this._screenShareList.delete(screenShare)
    })

    try {
      screenShare.runWorker('childMemberJoinedWorker', {
        worker: workers.childMemberJoinedWorker,
        initialState: {
          parentId: this.memberId,
        },
      })

      this._screenShareList.add(screenShare)
      if (autoJoin) {
        await screenShare.join()
      }
      return screenShare
    } catch (error) {
      this.logger.error('ScreenShare Error', error)
      throw error
    }
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
    const { autoJoin = true, audio = false, video = false } = opts
    if (!audio && !video) {
      throw new TypeError(
        'At least one of `audio` or `video` must be requested.'
      )
    }

    const options: BaseConnectionOptions<RoomSessionObjectEvents> = {
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
      componentListeners: ROOM_COMPONENT_LISTENERS,
    })(options)

    roomDevice.once('destroy', () => {
      // @ts-expect-error
      roomDevice.emit('room.left')
      this._deviceList.delete(roomDevice)
    })

    try {
      roomDevice.runWorker('childMemberJoinedWorker', {
        worker: workers.childMemberJoinedWorker,
        initialState: {
          parentId: this.memberId,
        },
      })

      this._deviceList.add(roomDevice)
      if (autoJoin) {
        await roomDevice.join()
      }
      return roomDevice
    } catch (error) {
      this.logger.error('RoomDevice Error', error)
      throw error
    }
  }

  join() {
    return super.invite<BaseRoomSession<this>>()
  }

  leave() {
    return this.hangup()
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    return this.triggerCustomSaga<undefined>(audioSetSpeakerAction(deviceId))
  }

  /** @internal */
  override async hangup(id?: string) {
    this._screenShareList.forEach((screenShare) => {
      screenShare.leave()
    })
    this._deviceList.forEach((device) => {
      device.leave()
    })

    return super.hangup(id)
  }

  /** @internal */
  protected _finalize() {
    this._screenShareList.clear()
    this._deviceList.clear()

    super._finalize()
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
}

export const RoomSessionAPI = extendComponent<
  RoomSessionConnection,
  RoomMethods
>(RoomSessionConnection, {
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
})

type RoomSessionObjectEventsHandlerMapping = RoomSessionObjectEvents &
  BaseConnectionStateEventTypes

/** @internal */
export const createBaseRoomSessionObject = <RoomSessionType>(
  params: BaseComponentOptions<RoomSessionObjectEventsHandlerMapping>
): BaseRoomSession<RoomSessionType> => {
  const room = connect<
    RoomSessionObjectEventsHandlerMapping,
    RoomSessionConnection,
    BaseRoomSession<RoomSessionType>
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: RoomSessionAPI,
    componentListeners: ROOM_COMPONENT_LISTENERS,
  })(params)

  return room
}
