import { CallingCallPlayEventParams } from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import { CallPlaybackEvents, CallPlaybackListeners } from '../../types'
import { Call } from '../Call'

export interface CallPlaybackOptions {
  call: Call
  payload: CallingCallPlayEventParams
  listeners?: CallPlaybackListeners
}

export class CallPay extends ListenSubscriber<
  CallPlaybackListeners,
  CallPlaybackEvents
> {
  private _payload: CallingCallPlayEventParams

  constructor(options: CallPlaybackOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload

    if (options.listeners) {
      this.listen(options.listeners)
    }
  }

  get id() {
    return this._payload?.control_id
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

  /** @internal */
  setPayload(payload: CallingCallPlayEventParams) {
    this._payload = payload
  }

  async stop() {
    await this._client.execute({
      method: 'calling.pay.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })
    return this
  }
}
