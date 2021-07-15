import { logger, connect } from '@signalwire/core'
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
  MemberCommandParams,
  MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
} from './utils/interfaces'
import {
  audioSetSpeakerAction,
  audioMuteMemberAction,
  audioUnmuteMemberAction,
  videoMuteMemberAction,
  videoUnmuteMemberAction,
  deafMemberAction,
  undeafMemberAction,
  setOutputVolumeMemberAction,
  setInputVolumeMemberAction,
  setInputSensitivityMemberAction,
  getMemberListAction,
  getLayoutListAction,
  setLayoutAction,
  removeMemberAction,
  hideVideoMutedAction,
  showVideoMutedAction,
} from './features/actions'
import { RoomScreenShare } from './RoomScreenShare'
import { RoomDevice } from './RoomDevice'

export class Room extends BaseConnection {
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
    }

    const screenShare: RoomScreenShareObject = connect({
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

    const roomDevice: RoomDeviceObject = connect({
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

  join() {
    return super.invite()
  }

  leave() {
    return this.hangup()
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    return this.triggerCustomSaga<undefined>(audioSetSpeakerAction(deviceId))
  }

  audioMute({ memberId }: MemberCommandParams = {}) {
    const action = audioMuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  audioUnmute({ memberId }: MemberCommandParams = {}) {
    const action = audioUnmuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  videoMute({ memberId }: MemberCommandParams = {}) {
    const action = videoMuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  videoUnmute({ memberId }: MemberCommandParams = {}) {
    const action = videoUnmuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  deaf({ memberId }: MemberCommandParams = {}) {
    const action = deafMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  undeaf({ memberId }: MemberCommandParams = {}) {
    const action = undeafMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  setMicrophoneVolume(params: MemberCommandWithVolumeParams) {
    const action = setOutputVolumeMemberAction({
      instance: this,
      ...params,
    })
    return this.execute(action)
  }

  setSpeakerVolume(params: MemberCommandWithVolumeParams) {
    const action = setInputVolumeMemberAction({
      instance: this,
      ...params,
    })
    return this.execute(action)
  }

  setInputSensitivity(params: MemberCommandWithValueParams) {
    const action = setInputSensitivityMemberAction({
      instance: this,
      ...params,
    })
    return this.execute(action)
  }

  removeMember({ memberId }: Required<MemberCommandParams>) {
    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    const action = removeMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  getMemberList() {
    const action = getMemberListAction({ instance: this })
    return this.execute(action)
  }

  getLayoutList() {
    const action = getLayoutListAction({ instance: this })
    return this.execute(action)
  }

  setLayout({ name }: { name: string }) {
    const action = setLayoutAction({ instance: this, name })
    return this.execute(action)
  }

  hideVideoMuted() {
    const action = hideVideoMutedAction({ instance: this })
    return this.execute(action)
  }

  showVideoMuted() {
    const action = showVideoMutedAction({ instance: this })
    return this.execute(action)
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
