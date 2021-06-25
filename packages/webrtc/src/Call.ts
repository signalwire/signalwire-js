import { logger, connect, getEventEmitter } from '@signalwire/core'
import { getDisplayMedia } from './utils/webrtcHelpers'
import { BaseCall, BaseCallOptions } from './BaseCall'

type StartScreenShareOptions = {
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export class Call extends BaseCall {
  private _screenShareList = new Set<Call>()

  get screenShareList() {
    return Array.from(this._screenShareList)
  }

  async startScreenShare(opts: StartScreenShareOptions = {}) {
    const { audio = false, video = true } = opts
    const displayStream: MediaStream = await getDisplayMedia({ audio, video })

    // FIXME: Remove it when "scoped" emitters are in
    const fakeEmitter = getEventEmitter({ token: '' })
    const options: BaseCallOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      skipLiveArray: true,
      localStream: displayStream,
      emitter: fakeEmitter,
    }

    const screenShare = connect({
      store: this.store,
      Component: Call,
      onStateChangeListeners: {
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
      await screenShare.join()
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
