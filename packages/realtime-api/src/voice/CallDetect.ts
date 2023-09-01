import {
  VoiceCallDetectContract,
  CallingCallDetectEndState,
  CallingCallDetectEventParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../ListenSubscriber'
import { Call } from './Call'
import {
  CallDetectEvents,
  CallDetectListeners,
  CallDetectListenersEventsMapping,
} from '../types'

export interface CallDetectOptions {
  call: Call
  payload: CallingCallDetectEventParams
  listeners?: CallDetectListeners
}

const ENDED_STATES: CallingCallDetectEndState[] = ['finished', 'error']

export class CallDetect
  extends ListenSubscriber<CallDetectListeners, CallDetectEvents>
  implements VoiceCallDetectContract
{
  private _payload: CallingCallDetectEventParams
  private _waitForBeep: boolean
  private _waitingForReady: boolean
  protected _eventMap: CallDetectListenersEventsMapping = {
    onStarted: 'detect.started',
    onUpdated: 'detect.updated',
    onEnded: 'detect.ended',
  }

  constructor(options: CallDetectOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload
    this._waitForBeep = options.payload.waitForBeep
    this._waitingForReady = false

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

  get callId() {
    return this._payload.call_id
  }

  get nodeId() {
    return this._payload.node_id
  }

  get detect() {
    return this._payload.detect
  }

  get type() {
    return this?.detect?.type
  }

  /** @internal */
  get waitForBeep() {
    return this._waitForBeep
  }

  /** @internal */
  get waitingForReady() {
    return this._waitingForReady
  }

  /** @internal */
  set waitingForReady(ready: boolean) {
    this._waitingForReady = ready
  }

  /** @internal */
  setPayload(payload: CallingCallDetectEventParams) {
    this._payload = payload
  }

  async stop() {
    // if (this.state !== 'finished') {
    await this._client.execute({
      method: 'calling.detect.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })
    // }

    return this
  }

  /** @deprecated */
  waitForResult() {
    return this.ended()
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        this.off('detect.ended', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallDetectWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallDetectWorker`
        resolve(this)
      }
      this.once('detect.ended', handler)

      // Resolve the promise if the detect has already ended
      if (
        ENDED_STATES.includes(
          this.detect?.params?.event as CallingCallDetectEndState
        )
      ) {
        handler()
      }
    })
  }
}
