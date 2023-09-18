import {
  VoiceCallPromptContract,
  CallingCallCollectEndState,
  CallingCallCollectEventParams,
} from '@signalwire/core'
import { Call } from '../Call'
import {
  CallPromptEvents,
  CallPromptListeners,
  CallPromptListenersEventsMapping,
} from '../../types'
import { ListenSubscriber } from '../../ListenSubscriber'

export interface CallPromptOptions {
  call: Call
  payload: CallingCallCollectEventParams
  listeners?: CallPromptListeners
}

const ENDED_STATES: CallingCallCollectEndState[] = [
  'no_input',
  'error',
  'no_match',
  'digit',
  'speech',
]

export class CallPrompt
  extends ListenSubscriber<CallPromptListeners, CallPromptEvents>
  implements VoiceCallPromptContract
{
  private _payload: CallingCallCollectEventParams
  protected _eventMap: CallPromptListenersEventsMapping = {
    onStarted: 'prompt.started',
    onUpdated: 'prompt.updated',
    onFailed: 'prompt.failed',
    onEnded: 'prompt.ended',
  }

  constructor(options: CallPromptOptions) {
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

  get hasEnded() {
    if (
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
      method: 'calling.play_and_collect.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async setVolume(volume: number): Promise<this> {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.play_and_collect.volume',
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
  waitForResult() {
    return this.ended()
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        this.off('prompt.ended', handler)
        this.off('prompt.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallPlayWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallPlayWorker`
        resolve(this)
      }
      this.once('prompt.ended', handler)
      this.once('prompt.failed', handler)

      // Resolve the promise if the prompt has already ended
      if (this.hasEnded) {
        handler()
      }
    })
  }
}
