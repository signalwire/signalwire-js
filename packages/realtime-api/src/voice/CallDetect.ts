import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallDetectContract,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * detect inside a Voice Call. You can obtain instances of this class by
 * starting a Detect from the desired {@link Call} (see
 * {@link Call.detect})
 */
export interface CallDetect extends VoiceCallDetectContract {}

export type CallDetectEventsHandlerMapping = {}

export interface CallDetectOptions
  extends BaseComponentOptions<CallDetectEventsHandlerMapping> {}

export class CallDetectAPI
  extends BaseComponent<CallDetectEventsHandlerMapping>
  implements VoiceCallDetectContract
{
  callId: string
  nodeId: string
  controlId: string
  // TODO: define all the props

  get id() {
    return this.controlId
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
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return detect
}
