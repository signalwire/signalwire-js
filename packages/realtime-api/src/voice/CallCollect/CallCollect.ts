import {
  VoiceCallCollectContract,
  CallingCallCollectEndState,
  CallingCallCollectEventParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  CallCollectEvents,
  CallCollectListeners,
  CallCollectListenersEventsMapping,
} from '../../types'
import { Call } from '../Call'

export interface CallCollectOptions {
  call: Call
  payload: CallingCallCollectEventParams
  listeners?: CallCollectListeners
}

const ENDED_STATES: CallingCallCollectEndState[] = [
  'error',
  'no_input',
  'no_match',
  'digit',
  'speech',
]

export class CallCollect
  extends ListenSubscriber<CallCollectListeners, CallCollectEvents>
  implements VoiceCallCollectContract
{
  private _payload: CallingCallCollectEventParams
  protected _eventMap: CallCollectListenersEventsMapping = {
    onStarted: 'collect.started',
    onInputStarted: 'collect.startOfInput',
    onUpdated: 'collect.updated',
    onFailed: 'collect.failed',
    onEnded: 'collect.ended',
  }

  constructor(options: CallCollectOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload

    if (options.listeners) {
      this.listen(options.listeners)
    }
  }

  get id() {
    return this._payload?.control_id.split('.')[0]
  }

  get controlId() {
    return this._payload.control_id
  }

  get callId() {
    return this._payload.call_id
  }

  get nodeId() {
    return this._payload.node_id
  }

  get result() {
    return this._payload.result
  }

  get type() {
    return this.result?.type
  }

  /**
   * User-friendly alias to understand the reason in case of errors
   * no_match | no_input | error
   */
  get reason() {
    return this.type
  }

  get digits() {
    if (this.result?.type === 'digit') {
      return this.result.params.digits
    }
    return undefined
  }

  get speech() {
    if (this.result?.type === 'speech') {
      return this.result.params.text
    }
    return undefined
  }

  get terminator() {
    if (this.result?.type === 'digit') {
      return this.result.params.terminator
    }
    return undefined
  }

  get text() {
    if (this.result?.type === 'speech') {
      return this.result.params.text
    }
    return undefined
  }

  get confidence() {
    if (this.result?.type === 'speech') {
      return this.result.params.confidence
    }
    return undefined
  }

  get state() {
    return this._payload.state
  }

  get final() {
    return this._payload.final
  }

  get hasEnded() {
    if (
      this.state !== 'collecting' &&
      this.final !== false &&
      ENDED_STATES.includes(this.result?.type as CallingCallCollectEndState)
    ) {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: CallingCallCollectEventParams) {
    this._payload = payload
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.collect.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async startInputTimers() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.collect.start_input_timers',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        this.off('collect.ended', handler)
        this.off('collect.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallCollectWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallCollectWorker`
        resolve(this)
      }
      this.once('collect.ended', handler)
      this.once('collect.failed', handler)

      // Resolve the promise if the collect has already ended
      if (this.hasEnded) {
        handler()
      }
    })
  }
}
