import {
  connect,
  BaseComponentOptions,
  VoiceCallPromptContract,
  CallingCallCollectResult,
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
    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)

      const handler = (callPrompt: CallPromptEndedEvent['params']) => {
        // This object gets created every time we call
        // `Call.prompt()`, instead of creating a brand new
        // object through the Emitter Transform we're
        // reusing that same instance created from `Call`
        // (and its Emitter Transform). Only thing we're
        // doing is to update the state of this object with
        // the lastes payload received from the server.
        this.result = callPrompt.result
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
