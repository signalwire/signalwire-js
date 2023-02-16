import {
  connect,
  BaseComponentOptions,
  VoiceCallPromptContract,
  CallingCallCollectResult,
  CallingCallCollectEndState,
  BaseComponent,
  CallPromptEndedEvent,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * prompt inside a Voice Call. You can obtain instances of this class by
 * starting a Prompt from the desired {@link Call} (see
 * {@link Call.prompt})
 */
export interface CallPrompt extends VoiceCallPromptContract {}

export type CallPromptEventsHandlerMapping = {}

export interface CallPromptOptions
  extends BaseComponentOptions<CallPromptEventsHandlerMapping> {}

const ENDED_STATES: CallingCallCollectEndState[] = [
  'no_input',
  'error',
  'no_match',
  'digit',
  'speech',
]

export class CallPromptAPI
  extends BaseComponent<CallPromptEventsHandlerMapping>
  implements VoiceCallPromptContract
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
        method: 'calling.play_and_collect.stop',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: this.controlId,
        },
      })
    }

    /**
     * TODO: we should wait for the prompt to be finished to allow
     * the CallPrompt/Proxy object to update the payload properly
     */

    return this
  }

  async setVolume(volume: number): Promise<this> {
    await this.execute({
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
    // Resolve the promise if the prompt has already ended
    if (
      ENDED_STATES.includes(this.result?.type as CallingCallCollectEndState)
    ) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)
      const handler = (_callPrompt: CallPromptEndedEvent['params']) => {
        // @ts-expect-error
        this.off('prompt.ended', handler)
        // @ts-expect-error
        this.off('prompt.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.prompt()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallPromptWorker`
        resolve(this)
      }
      // @ts-expect-error
      this.once('prompt.ended', handler)
      // @ts-expect-error
      this.once('prompt.failed', handler)
    })
  }
}

export const createCallPromptObject = (
  params: CallPromptOptions
): CallPrompt => {
  const record = connect<
    CallPromptEventsHandlerMapping,
    CallPromptAPI,
    CallPrompt
  >({
    store: params.store,
    Component: CallPromptAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return record
}
