import {
  connect,
  BaseComponentOptionsWithPayload,
  VoiceCallDetectContract,
  CallingCallDetectEventParams,
  BaseConsumer,
  EventEmitter,
  type DetectorResult,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * detect inside a Voice Call. You can obtain instances of this class by
 * starting a Detect from the desired {@link Call} (see
 * {@link Call.detect})
 */
export interface CallDetect extends VoiceCallDetectContract {
  setPayload: (payload: CallingCallDetectEventParams) => void
  waitingForReady: boolean
  waitForBeep: boolean
  /** @internal */
  emit(event: EventEmitter.EventNames<any>, ...args: any[]): void
}

export type CallDetectEventsHandlerMapping = {}

export interface CallDetectOptions
  extends BaseComponentOptionsWithPayload<CallingCallDetectEventParams> {}

const ENDED_STATES: DetectorResult[] = ['finished', 'error']

export class CallDetectAPI
  extends BaseConsumer<CallDetectEventsHandlerMapping>
  implements VoiceCallDetectContract
{
  private _payload: CallingCallDetectEventParams
  private _waitForBeep: boolean
  private _result: DetectorResult = 'UNKNOWN'

  constructor(options: CallDetectOptions) {
    super(options)

    this._payload = options.payload
    this._waitForBeep = options.payload.waitForBeep
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

  /** @internal */
  protected setPayload(payload: CallingCallDetectEventParams) {
    this._payload = payload

    const lastEvent = this._lastEvent()
    if (lastEvent && lastEvent !== 'finished') {
      this._result = lastEvent
    }
  }

  async stop() {
    // if (this.state !== 'finished') {
    await this.execute({
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
    // Resolve the promise if the detect has already ended
    const lastEvent = this._lastEvent()
    if (lastEvent && ENDED_STATES.includes(lastEvent)) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      const handler = () => {
        // @ts-expect-error
        this.off('detect.ended', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.detect()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallDetectWorker`
        resolve(this)
      }

      // @ts-expect-error
      this.once('detect.ended', handler)
    })
  }

  private _lastEvent() {
    return this.detect?.params.event
  }
}

export const createCallDetectObject = (
  params: CallDetectOptions
): CallDetect => {
  const detect = connect<
    CallDetectEventsHandlerMapping,
    CallDetectAPI,
    CallDetect
  >({
    store: params.store,
    Component: CallDetectAPI,
  })(params)

  return detect
}
