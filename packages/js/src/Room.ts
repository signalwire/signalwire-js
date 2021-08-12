import { logger, connect, Rooms, RoomCustomMethods } from '@signalwire/core'
import {
  getDisplayMedia,
  BaseConnection,
  BaseConnectionOptions,
} from '@signalwire/webrtc'
import {
  RoomScreenShareObject,
  RoomDeviceObject,
  CreateScreenShareObjectOptions,
  AddDeviceOptions,
  AddCameraOptions,
  AddMicrophoneOptions,
  BaseRoomInterface,
  RoomMethods,
} from './utils/interfaces'
import { ROOM_COMPONENT_LISTENERS } from './utils/constants'
import { audioSetSpeakerAction } from './features/actions'
import { RoomScreenShare } from './RoomScreenShare'
import { RoomDevice } from './RoomDevice'

interface Room extends RoomMethods {}

class Room extends BaseConnection implements BaseRoomInterface {
  private _screenShareList = new Set<RoomScreenShareObject>()
  private _deviceList = new Set<RoomDeviceObject>()

  get screenShareList() {
    return Array.from(this._screenShareList)
  }

  get deviceList() {
    return Array.from(this._deviceList)
  }

  /**
   * Allow sharing the screen within the room.
   */
  async createScreenShareObject(opts: CreateScreenShareObjectOptions = {}) {
    const { autoJoin = true, audio = false, video = true } = opts
    const displayStream: MediaStream = await getDisplayMedia({ audio, video })
    const options: BaseConnectionOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      localStream: displayStream,
      remoteStream: undefined,
      userVariables: {
        ...(this.options.userVariables || {}),
        memberCallId: this.id,
        memberId: this.memberId,
      },
    }

    const screenShare: RoomScreenShareObject = connect({
      store: this.store,
      Component: RoomScreenShare,
      componentListeners: ROOM_COMPONENT_LISTENERS,
    })(options)

    /**
     * Hangup if the user stop the screenShare from the
     * native browser button or if the videoTrack ends.
     */
    displayStream.getVideoTracks().forEach((t) => {
      t.addEventListener('ended', () => {
        if (screenShare && screenShare.active) {
          screenShare.hangup()
        }
      })
    })

    screenShare.on('destroy', () => {
      this._screenShareList.delete(screenShare)
    })

    try {
      this._screenShareList.add(screenShare)
      if (autoJoin) {
        await screenShare.join()
      }
      return screenShare
    } catch (error) {
      logger.error('ScreenShare Error', error)
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

    const options: BaseConnectionOptions = {
      ...this.options,
      localStream: undefined,
      remoteStream: undefined,
      audio,
      video,
      additionalDevice: true,
      recoverCall: false,
      userVariables: {
        ...(this.options.userVariables || {}),
        memberCallId: this.id,
        memberId: this.memberId,
      },
    }

    const roomDevice: RoomDeviceObject = connect({
      store: this.store,
      Component: RoomDevice,
      componentListeners: ROOM_COMPONENT_LISTENERS,
    })(options)

    roomDevice.on('destroy', () => {
      this._deviceList.delete(roomDevice)
    })

    try {
      this._deviceList.add(roomDevice)
      if (autoJoin) {
        await roomDevice.join()
      }
      return roomDevice
    } catch (error) {
      logger.error('RoomDevice Error', error)
      throw error
    }
  }

  join() {
    return super.invite<Room>()
  }

  leave() {
    return this.hangup()
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    return this.triggerCustomSaga<undefined>(audioSetSpeakerAction(deviceId))
  }

  /** @internal */
  async hangup() {
    this._screenShareList.forEach((screenShare) => {
      screenShare.hangup()
    })
    this._deviceList.forEach((device) => {
      device.hangup()
    })

    return super.hangup()
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
    return this.getLayouts()
  }

  /**
   * @deprecated Use {@link getMembers} instead. `getMemberList` will
   * be removed in v3.0.0
   */
  getMemberList() {
    return this.getMembers()
  }
}

const customMethods: RoomCustomMethods<RoomMethods> = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  getMembers: Rooms.getMembers,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
  hideVideoMuted: Rooms.hideVideoMuted,
  showVideoMuted: Rooms.showVideoMuted,
}
Object.defineProperties(Room.prototype, customMethods)

export { Room }
