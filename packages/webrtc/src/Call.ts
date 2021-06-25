import { logger, connect, getEventEmitter } from '@signalwire/core'
import { getDisplayMedia } from './utils/webrtcHelpers'
import { BaseCall, BaseCallOptions } from './BaseCall'

export class Call extends BaseCall {
  async startScreenShare(opts?: BaseCallOptions) {
    const { audio = false, video = true } = opts || {}
    const displayStream: MediaStream = await getDisplayMedia({ audio, video })
    displayStream.getTracks().forEach((t) => {
      t.addEventListener('ended', () => {
        if (this.screenShare) {
          this.screenShare.hangup()
        }
      })
    })
    // FIXME: Make better emitters
    const fakeEmitter = getEventEmitter({ token: '' })

    const options: BaseCallOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      skipLiveArray: true,
      localStream: displayStream,
      emitter: fakeEmitter,
      ...opts,
    }

    this.screenShare = connect({
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

    try {
      await this.screenShare.invite()
      return this.screenShare
    } catch (error) {
      logger.error('ScreenShare Error', error)
      throw error
    }
  }
}
