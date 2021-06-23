import { logger } from '@signalwire/core'
import { getDisplayMedia } from '@signalwire/webrtc'
import { BaseCall, BaseCallOptions } from './BaseCall'

export class Call extends BaseCall {

  async startScreenShare(opts?: BaseCallOptions) {
    const { audio = false, video = true } = (opts || {})
    const displayStream: MediaStream = await getDisplayMedia({ audio, video })
    displayStream.getTracks().forEach(t => {
      t.addEventListener('ended', () => {
        if (this.screenShare) {
          this.screenShare.hangup()
        }
      })
    })
    const options: BaseCallOptions = {
      ...this.options,
      screenShare: true,
      recoverCall: false,
      skipLiveArray: true,
      localStream: displayStream,
      ...opts,
      destinationNumber: 'edoRoom2',
    }
    this.screenShare = new Call(options)
    try {
      await this.screenShare.invite()
      return this.screenShare
    } catch (error) {
      logger.error('ScreenShare Error', error)
      throw error
    }
  }
}
