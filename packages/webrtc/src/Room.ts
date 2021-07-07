import { logger, connect } from '@signalwire/core'
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
    const options: BaseConnectionOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      skipLiveArray: true,
      localStream: displayStream,
    }

    const screenShare: RoomObject = connect({
      store: this.store,
      Component: Room,
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

  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }

  /** @internal */
  async hangup() {
    this._screenShareList.forEach((screenShare) => {
      screenShare.hangup()
    })

    return super.hangup()
  }

  /** @internal */
  protected _finalize() {
    this._screenShareList.clear()

    super._finalize()
  }
}
