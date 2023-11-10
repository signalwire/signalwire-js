import {
  connect,
  BaseComponentOptionsWithPayload,
  VoiceCallCollectContract,
  CallingCallCollectEndState,
  CallCollectEndedEvent,
  CallingCallCollectEventParams,
  EventEmitter,
  BaseConsumer,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * prompt inside a Voice Call. You can obtain instances of this class by
 * starting a Prompt from the desired {@link Call} (see
 * {@link Call.prompt})
 */
export interface CallCollect extends VoiceCallCollectContract {
  setPayload: (payload: CallingCallCollectEventParams) => void
  /** @internal */
  emit(event: EventEmitter.EventNames<any>, ...args: any[]): void
}

export type CallCollectEventsHandlerMapping = {}

export interface CallCollectOptions
  extends BaseComponentOptionsWithPayload<CallingCallCollectEventParams> {}

const ENDED_STATES: CallingCallCollectEndState[] = [
  'error',
  'no_input',
  'no_match',
  'digit',
  'speech',
]

export class CallCollectAPI
  extends BaseConsumer<CallCollectEventsHandlerMapping>
  implements VoiceCallCollectContract
{
  private _payload: CallingCallCollectEventParams

  constructor(options: CallCollectOptions) {
    super(options)

    this._payload = options.payload
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

  /** @internal */
  protected setPayload(payload: CallingCallCollectEventParams) {
    this._payload = payload
  }

  async stop() {
    // Execute stop only if we don't have result yet
    if (!this.result) {
      await this.execute({
        method: 'calling.collect.stop',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: this.controlId,
        },
      })
    }

    /**
     * TODO: we should wait for the prompt to be finished to allow
     * the CallCollect/Proxy object to update the payload properly
     */

    return this
  }

  async startInputTimers() {
    await this.execute({
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
    // Resolve the promise if the collect has already ended
    if (
      this.state != 'collecting' && this.final !== false &&
      ENDED_STATES.includes(this.result?.type as CallingCallCollectEndState)
    ) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      const handler = (_callCollect: CallCollectEndedEvent['params']) => {
        // @ts-expect-error
        this.off('collect.ended', handler)
        // @ts-expect-error
        this.off('collect.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.prompt()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallCollectWorker`
        resolve(this)
      }
      // @ts-expect-error
      this.once('collect.ended', handler)
      // @ts-expect-error
      this.once('collect.failed', handler)
    })
  }
}

export const createCallCollectObject = (
  params: CallCollectOptions
): CallCollect => {
  const collect = connect<
    CallCollectEventsHandlerMapping,
    CallCollectAPI,
    CallCollect
  >({
    store: params.store,
    Component: CallCollectAPI,
  })(params)

  return collect
}
