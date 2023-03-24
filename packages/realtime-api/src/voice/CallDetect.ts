import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallDetectContract,
  CallingCallDetectEndState,
  CallingCallDetectEventParams,
  EventEmitter,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * detect inside a Voice Call. You can obtain instances of this class by
 * starting a Detect from the desired {@link Call} (see
 * {@link Call.detect})
 */
export interface CallDetect extends VoiceCallDetectContract {
  setPayload: (payload: CallingCallDetectEventParams) => void
  baseEmitter: EventEmitter
}

export type CallDetectEventsHandlerMapping = {}

export interface CallDetectOptions
  extends BaseComponentOptions<CallDetectEventsHandlerMapping> {}

const ENDED_STATES: CallingCallDetectEndState[] = ['finished', 'error']

export class CallDetectAPI
  extends BaseComponent<CallDetectEventsHandlerMapping>
  implements VoiceCallDetectContract
{
  protected _eventsPrefix = 'calling' as const
  private _payload: CallingCallDetectEventParams

  constructor(options: BaseComponentOptions<CallDetectEventsHandlerMapping>) {
    super(options)

    this._payload = options.payload
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
  protected setPayload(payload: CallingCallDetectEventParams) {
    this._payload = payload
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
    if (
      ENDED_STATES.includes(
        this.detect?.params?.event as CallingCallDetectEndState
      )
    ) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)

      const handler = () => {
        // @ts-expect-error
        this._off('detect.ended', handler)
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
      this._once('detect.ended', handler)
    })
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
