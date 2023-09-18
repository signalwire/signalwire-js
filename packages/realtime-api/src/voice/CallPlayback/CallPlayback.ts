import {
  CallingCallPlayEndState,
  CallingCallPlayEventParams,
  VoiceCallPlaybackContract,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  CallPlaybackEvents,
  CallPlaybackListeners,
  CallPlaybackListenersEventsMapping,
} from '../../types'
import { Call } from '../Call'

export interface CallPlaybackOptions {
  call: Call
  payload: CallingCallPlayEventParams
  listeners?: CallPlaybackListeners
}

const ENDED_STATES: CallingCallPlayEndState[] = ['finished', 'error']

export class CallPlayback
  extends ListenSubscriber<CallPlaybackListeners, CallPlaybackEvents>
  implements VoiceCallPlaybackContract
{
  public _paused: boolean
  private _volume: number
  private _payload: CallingCallPlayEventParams
  protected _eventMap: CallPlaybackListenersEventsMapping = {
    onStarted: 'playback.started',
    onUpdated: 'playback.updated',
    onFailed: 'playback.failed',
    onEnded: 'playback.ended',
  }

  constructor(options: CallPlaybackOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload
    this._paused = false

    if (options.listeners) {
      this.listen(options.listeners)
    }
  }

  get id() {
    return this._payload?.control_id.split('.')[0]
  }

  get volume() {
    return this._volume
  }

  get callId() {
    return this._payload?.call_id
  }

  get nodeId() {
    return this._payload?.node_id
  }

  get controlId() {
    return this._payload?.control_id
  }

  get state() {
    return this._payload?.state
  }

  get hasEnded() {
    if (ENDED_STATES.includes(this.state as CallingCallPlayEndState)) {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: CallingCallPlayEventParams) {
    this._payload = payload
  }

  async pause() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.play.pause',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async resume() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.play.resume',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.play.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async setVolume(volume: number) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    this._volume = volume

    await this._client.execute({
      method: 'calling.play.volume',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
        volume,
      },
    })

    return this
  }

  /** @deprecated */
  waitForEnded() {
    return this.ended()
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        this.off('playback.ended', handler)
        this.off('playback.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallPlayWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallPlayWorker`
        resolve(this)
      }
      this.once('playback.ended', handler)
      this.once('playback.failed', handler)

      // Resolve the promise if the play has already ended
      if (this.hasEnded) {
        handler()
      }
    })
  }
}
