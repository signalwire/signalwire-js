import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallPromptContract,
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
  callId: string
  nodeId: string
  controlId: string
  result: any // FIXME:

  get id() {
    return this.controlId
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
     * TODO: we should wait for the prompt `finished` event to allow
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
