import {
  VoiceCallTapContract,
  CallingCallTapEndState,
  CallingCallTapEventParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  CallTapEvents,
  CallTapListeners,
  CallTapListenersEventsMapping,
} from '../../types'
import { Call } from '../Call'

export interface CallTapOptions {
  call: Call
  payload: CallingCallTapEventParams
  listeners?: CallTapListeners
}

const ENDED_STATES: CallingCallTapEndState[] = ['finished']

export class CallTap
  extends ListenSubscriber<CallTapListeners, CallTapEvents>
  implements VoiceCallTapContract
{
  private _payload: CallingCallTapEventParams
  protected _eventMap: CallTapListenersEventsMapping = {
    onStarted: 'tap.started',
    onEnded: 'tap.ended',
  }

  constructor(options: CallTapOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload

    if (options.listeners) {
      this.listen(options.listeners)
    }
  }

  get id() {
    return this._payload.control_id
  }

  get controlId() {
    return this._payload.control_id
  }

  get nodeId() {
    return this._payload.node_id
  }

  get callId() {
    return this._payload.call_id
  }

  get state() {
    return this._payload.state
  }

  get hasEnded() {
    if (ENDED_STATES.includes(this.state as CallingCallTapEndState)) {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: CallingCallTapEventParams) {
    this._payload = payload
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.tap.stop',
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
        this.off('tap.ended', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallTapWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallTapWorker`
        resolve(this)
      }
      this.once('tap.ended', handler)

      // Resolve the promise if the tap has already ended
      if (this.hasEnded) {
        handler()
      }
    })
  }
}
