import {
  connect,
  Rooms,
  extendComponent,
  BaseComponentContract,
  BaseComponentOptions,
  BaseConnectionContract,
  VideoAuthorization,
  LOCAL_EVENT_PREFIX,
  validateEventsToSubscribe,
  EventEmitter,
} from '@signalwire/core'
import {
  getDisplayMedia,
  BaseConnection,
  BaseConnectionOptions,
  BaseConnectionStateEventTypes,
  supportsMediaOutput,
  createSpeakerDeviceWatcher,
  getSpeakerById,
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
  LocalOverlay,
} from './utils/interfaces'
import { SCREENSHARE_AUDIO_CONSTRAINTS } from './utils/constants'
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
  private _mirrored: LocalOverlay['mirrored']
  private _audioEl:
    | HTMLAudioElement & {
        sinkId?: string
        setSinkId?: (id: string) => Promise<void>
      }

  constructor(
    options: BaseConnection<RoomSessionObjectEvents> & {
      mirrorLocalVideoOverlay: boolean
    }
  ) {
    super(options)
    this._mirrored = options.mirrorLocalVideoOverlay

    this.runWorker('videoWorker', {
      worker: workers.videoWorker,
    })
  }

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

  /** @deprecated Use {@link startScreenShare} instead. */
  async createScreenShareObject(opts: CreateScreenShareObjectOptions = {}) {
    return this.startScreenShare(opts)
  }

  /**
   * Allow sharing the screen within the room.
   */
  async startScreenShare(opts: StartScreenShareOptions = {}) {
    return new Promise<RoomSessionScreenShare>(async (resolve, reject) => {
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
      const options: BaseConnectionOptions = {
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
        screenShare.emit('room.left')
        this._screenShareList.delete(screenShare)
      })

      try {
        screenShare.runWorker('childMemberJoinedWorker', {
          worker: workers.childMemberJoinedWorker,
          onDone: () => resolve(screenShare),
          onFail: reject,
          initialState: {
            parentId: this.memberId,
          },
        })

        this._screenShareList.add(screenShare)
        if (autoJoin) {
          return await screenShare.join()
        }
        return resolve(screenShare)
      } catch (error) {
        this.logger.error('ScreenShare Error', error)
        reject(error)
      }
    })
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

  join() {
    return super.invite<BaseRoomSession<this>>()
  }

  leave() {
    return this.hangup()
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    const prevId = this._audioEl.sinkId as string
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

  private _attachSpeakerTrackListener() {
    if (!supportsMediaOutput()) return

    // @TODO: Stop the watcher when user leave/disconnects
    createSpeakerDeviceWatcher().then((deviceWatcher) => {
      deviceWatcher.on('removed', async (data) => {
        const sinkId = this._audioEl.sinkId
        const disconnectedSpeaker = data.changes.find((device) => {
          const payloadDeviceId = device.payload.deviceId

          return (
            payloadDeviceId === sinkId ||
            (payloadDeviceId === '' && sinkId === 'default') ||
            (payloadDeviceId === 'default' && sinkId === '')
          )
        })
        if (disconnectedSpeaker) {
          this.emit('speaker.disconnected', {
            deviceId: disconnectedSpeaker.payload.deviceId,
            label: disconnectedSpeaker.payload.label,
          })

          /**
           * In case the currently in-use speaker disconnects, OS by default fallbacks to the default speaker
           * Set the sink id here to make the SDK consistent with the OS
           */
          await this._audioEl.setSinkId?.('')

          const defaultSpeakers = await getSpeakerById('default')

          if (!defaultSpeakers?.deviceId) return

          // Emit the speaker.updated event since the OS will fallback to the default speaker
          this.emit('speaker.updated', {
            previous: {
              deviceId: disconnectedSpeaker.payload.deviceId,
              label: disconnectedSpeaker.payload.label,
            },
            current: {
              deviceId: defaultSpeakers.deviceId,
              label: defaultSpeakers.label,
            },
          })
        }
      })
    })
  }

  getAudioEl() {
    if (this._audioEl) return this._audioEl
    this._audioEl = new Audio()
    this._attachSpeakerTrackListener()
    return this._audioEl
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

  /**
   * Local video stream overlay
   */
  get localOverlay() {
    return {
      mirrored: this._mirrored,
      setMirrored: (value: boolean) => {
        this._mirrored = value
        this.emit(
          // @ts-expect-error
          `${LOCAL_EVENT_PREFIX}.mirror.video`,
          this._mirrored
        )
      },
    }
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${event}`
    ) as EventEmitter.EventNames<RoomSessionObjectEvents>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
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
  lock: Rooms.lock,
  unlock: Rooms.unlock,
  setRaisedHand: Rooms.setRaisedHand,
  setPrioritizeHandraise: Rooms.setPrioritizeHandraise,
})

type RoomSessionObjectEventsHandlerMapping = RoomSessionObjectEvents &
  BaseConnectionStateEventTypes

/** @internal */
export const createBaseRoomSessionObject = <RoomSessionType>(
  params: BaseComponentOptions
): BaseRoomSession<RoomSessionType> => {
  const room = connect<
    RoomSessionObjectEventsHandlerMapping,
    RoomSessionConnection,
    BaseRoomSession<RoomSessionType>
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: RoomSessionAPI,
  })(params)

  return room
}
