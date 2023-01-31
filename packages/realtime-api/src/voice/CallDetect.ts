import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallDetectContract,
  Detector,
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

const ENDED_STATES: string[] = ['finished', 'error']

export class CallDetectAPI
  extends BaseComponent<CallDetectEventsHandlerMapping>
  implements VoiceCallDetectContract
{
  protected _eventsPrefix = 'calling' as const

  callId: string
  nodeId: string
  controlId: string
  detect?: Detector

  get id() {
    return this.controlId
  }

  get type() {
    return this?.detect?.type
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
    if (ENDED_STATES.includes(this.detect?.params?.event as string)) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)

      // @ts-expect-error
      this.once('detect.ended', () => {
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.detect()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallDetectWorker`
        resolve(this)
      })
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
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return detect
}
