import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallTapContract,
  CallingCallTapState,
  CallingCallTapEndState,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * tap inside a Voice Call. You can obtain instances of this class by
 * starting a Tap from the desired {@link Call} (see
 * {@link Call.tap})
 */
export interface CallTap extends VoiceCallTapContract {}

export type CallTapEventsHandlerMapping = {}

export interface CallTapOptions
  extends BaseComponentOptions<CallTapEventsHandlerMapping> {}

const ENDED_STATES: CallingCallTapEndState[] = ['finished']

export class CallTapAPI
  extends BaseComponent<CallTapEventsHandlerMapping>
  implements VoiceCallTapContract
{
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallTapState

  get id() {
    return this.controlId
  }

  async stop() {
    if (this.state !== 'finished') {
      await this.execute({
        method: 'calling.tap.stop',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: this.controlId,
        },
      })
    }

    return this
  }

  ended() {
    // Resolve the promise if the tap has already ended
    if (ENDED_STATES.includes(this.state as CallingCallTapEndState)) {
      return Promise.resolve(this)
    }

    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)

      const handler = () => {
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.tap()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallTapWorker`
        resolve(this)
      }
      // @ts-expect-error
      this.once('tap.ended', handler)
    })
  }
}

export const createCallTapObject = (params: CallTapOptions): CallTap => {
  const tap = connect<CallTapEventsHandlerMapping, CallTapAPI, CallTap>({
    store: params.store,
    Component: CallTapAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return tap
}
