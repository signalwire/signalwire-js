import { logger, connect, getEventEmitter } from '@signalwire/core'
import { getDisplayMedia } from './utils/webrtcHelpers'
import { RoomObject, CreateScreenShareObjectOptions } from './utils/interfaces'
import { BaseConnection, BaseConnectionOptions } from './BaseConnection'

export class Room extends BaseConnection {
  private _screenShareList = new Set<RoomObject>()

  get screenShareList() {
    return Array.from(this._screenShareList)
  }

  /**
   * Allow sharing the screen within the room.
   */
  async createScreenShareObject(opts: CreateScreenShareObjectOptions = {}) {
    const { autoJoin = true, audio = false, video = true } = opts
    const displayStream: MediaStream = await getDisplayMedia({ audio, video })

    // FIXME: Remove it when "scoped" emitters are in
    const fakeEmitter = getEventEmitter({ token: '' })
    const options: BaseConnectionOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      skipLiveArray: true,
      localStream: displayStream,
      emitter: fakeEmitter,
    }

    const screenShare: RoomObject = connect({
      store: this.store,
      Component: Room,
      componentListeners: {
        state: 'onStateChange',
        remoteSDP: 'onRemoteSDP',
        roomId: 'onRoomId',
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

  async hangup() {
    this._screenShareList.forEach((screenShare) => {
      screenShare.hangup()
    })

    return super.hangup()
  }

  protected _finalize() {
    this._screenShareList.clear()

    super._finalize()
  }
}
