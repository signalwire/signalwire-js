import { logger, connect } from '@signalwire/core'
import { getDisplayMedia } from './utils/webrtcHelpers'
import {
  RoomObject,
  CreateScreenShareObjectOptions,
  CreateSecondSourceObjectOptions,
} from './utils/interfaces'
import { BaseConnection, BaseConnectionOptions } from './BaseConnection'

export class Room extends BaseConnection {
  private _screenShareList = new Set<RoomObject>()
  private _secondSourceList = new Set<RoomObject>()

  get screenShareList() {
    return Array.from(this._screenShareList)
  }

  get secondSourceList() {
    return Array.from(this._secondSourceList)
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

  /**
   * Allow to attach additional media sources to the room.
   */
  async createSecondSourceObject(opts: CreateSecondSourceObjectOptions = {}) {
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
      secondSource: true,
      recoverCall: false,
      skipLiveArray: true,
    }

    const secondSource: RoomObject = connect({
      store: this.store,
      Component: Room,
      componentListeners: {
        state: 'onStateChange',
        remoteSDP: 'onRemoteSDP',
        // TODO: find another way to namespace `secondSourceObj`s
        nodeId: 'onNodeId',
        errors: 'onError',
        responses: 'onSuccess',
      },
    })(options)

    secondSource.on('destroy', () => {
      this._secondSourceList.delete(secondSource)
    })

    try {
      this._secondSourceList.add(secondSource)
      if (autoJoin) {
        await secondSource.join()
      }
      return secondSource
    } catch (error) {
      logger.error('SecondSource Error', error)
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
    this._secondSourceList.forEach((secondSource) => {
      secondSource.hangup()
    })

    return super.hangup()
  }

  /** @internal */
  protected _finalize() {
    this._screenShareList.clear()
    this._secondSourceList.clear()

    super._finalize()
  }
}
