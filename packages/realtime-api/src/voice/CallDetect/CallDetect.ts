import {
  VoiceCallDetectContract,
  CallingCallDetectEventParams,
  type DetectorResult,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  CallDetectEvents,
  CallDetectListeners,
  CallDetectListenersEventsMapping,
} from '../../types'
import { Call } from '../Call'

export interface CallDetectOptions {
  call: Call
  payload: CallingCallDetectEventParams
  listeners?: CallDetectListeners
}

const ENDED_STATES: DetectorResult[] = ['finished', 'error']

export class CallDetect
  extends ListenSubscriber<CallDetectListeners, CallDetectEvents>
  implements VoiceCallDetectContract
{
  private _waitForBeep: boolean
  private _result: DetectorResult = 'UNKNOWN'
  private _payload: CallingCallDetectEventParams
  protected _eventMap: CallDetectListenersEventsMapping = {
    onStarted: 'detect.started',
    onUpdated: 'detect.updated',
    onEnded: 'detect.ended',
  }

  constructor(options: CallDetectOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload
    this._waitForBeep = options.payload.waitForBeep

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

  get result() {
    return this._result
  }

  get waitForBeep() {
    return this._waitForBeep
  }

  get beep() {
    if (this.detect?.params.event === 'MACHINE') {
      return Boolean(this.detect.params.beep)
    }
    return undefined
  }

  get hasEnded() {
    const lastEvent = this._lastEvent()
    if (lastEvent && ENDED_STATES.includes(lastEvent)) {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: CallingCallDetectEventParams) {
    this._payload = payload

    const lastEvent = this._lastEvent()
    if (lastEvent && lastEvent !== 'finished') {
      this._result = lastEvent
    }
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.detect.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  /** @deprecated */
  waitForResult() {
    return this.ended()
  }

  ended() {
    // Resolve the promise if the detect has already ended
    const lastEvent = this._lastEvent()
    if (lastEvent && ENDED_STATES.includes(lastEvent)) {
      return Promise.resolve(this)
    }

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
    })
  }

  private _lastEvent() {
    return this.detect?.params.event
  }
}
