import { compose } from 'redux'
import { logger, connect } from '@signalwire/core'
import {
  getDisplayMedia,
  BaseConnection,
  BaseConnectionOptions,
} from '@signalwire/webrtc'
import {
  CreateScreenShareObjectOptions,
  AddDeviceOptions,
  AddCameraOptions,
  AddMicrophoneOptions,
} from './utils/interfaces'
import { audioSetSpeakerAction } from './features/actions'
import {
  withBaseRoomMethods,
  withRoomLayoutMethods,
  withRoomMemberMethods,
  withRoomControlMethods,
  RoomConstructor,
} from './features/mixins'
import { RoomScreenShare } from './RoomScreenShare'
import { RoomDevice } from './RoomDevice'

const RoomMixin = compose<RoomConstructor>(
  withBaseRoomMethods,
  withRoomLayoutMethods,
  withRoomMemberMethods,
  withRoomControlMethods
)(BaseConnection)

export class Room extends RoomMixin {
  private _screenShareList = new Set<RoomScreenShare>()
  private _deviceList = new Set<RoomDevice>()

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
    }

    const screenShare = connect({
      store: this.store,
      Component: RoomScreenShare,
      componentListeners: {
        state: 'onStateChange',
        remoteSDP: 'onRemoteSDP',
        // TODO: find another way to namespace `screenShareObj`s
        nodeId: 'onNodeId',
        errors: 'onError',
        responses: 'onSuccess',
      },
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
    }

    const roomDevice = connect({
      store: this.store,
      Component: RoomDevice,
      componentListeners: {
        state: 'onStateChange',
        remoteSDP: 'onRemoteSDP',
        // TODO: find another way to namespace `roomDeviceObj`s
        nodeId: 'onNodeId',
        errors: 'onError',
        responses: 'onSuccess',
      },
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

  updateSpeaker(deviceId: string) {
    this.store.dispatch(audioSetSpeakerAction(deviceId))
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
}
