import {
  connect,
  BaseComponentOptions,
  VoiceCallCollectContract,
  CallingCallCollectResult,
  BaseComponent,
  CallCollectEndedEvent,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * prompt inside a Voice Call. You can obtain instances of this class by
 * starting a Prompt from the desired {@link Call} (see
 * {@link Call.prompt})
 */
export interface CallCollect extends VoiceCallCollectContract {}

export type CallCollectEventsHandlerMapping = {}

export interface CallCollectOptions
  extends BaseComponentOptions<CallCollectEventsHandlerMapping> {}

const ENDED_STATES: string[] = [
  'error',
  'no_input',
  'no_match',
  'digit',
  'speech',
]

export class CallCollectAPI
  extends BaseComponent<CallCollectEventsHandlerMapping>
  implements VoiceCallCollectContract
{
  protected _eventsPrefix = 'calling' as const

  callId: string
  nodeId: string
  controlId: string
  result?: CallingCallCollectResult

  get id() {
    return this.controlId
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
    if (ENDED_STATES.includes(this.result?.type as string)) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)
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
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return collect
}
