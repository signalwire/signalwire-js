import {
  connect,
  BaseComponentOptions,
  VoiceCallRecordingContract,
  CallingCallRecordEndState,
  CallingCallRecordEventParams,
  EventEmitter,
} from '@signalwire/core'
import { ApplyEventListeners } from '../ApplyEventListeners'

/**
 * Instances of this class allow you to control (e.g., resume) the
 * recording inside a Voice Call. You can obtain instances of this class by
 * starting a recording from the desired {@link Call} (see
 * {@link Call.record})
 */
export interface CallRecording extends VoiceCallRecordingContract {
  setPayload: (payload: CallingCallRecordEventParams) => void
  _paused: boolean
  baseEmitter: EventEmitter
}

export type CallRecordingEventsHandlerMapping = {}

export interface CallRecordingOptions
  extends BaseComponentOptions<CallRecordingEventsHandlerMapping> {
  payload: CallingCallRecordEventParams
}

const ENDED_STATES: CallingCallRecordEndState[] = ['finished', 'no_input']

export class CallRecordingAPI
  extends ApplyEventListeners<CallRecordingEventsHandlerMapping>
  implements VoiceCallRecordingContract
{
  protected _eventsPrefix = 'calling' as const
  private _payload: CallingCallRecordEventParams

  constructor(options: CallRecordingOptions) {
    super(options)

    this._payload = options.payload
  }

  get id() {
    return this._payload?.control_id
  }

  get callId() {
    return this._payload?.call_id
  }

  get nodeId() {
    return this._payload?.node_id
  }

  get controlId() {
    return this._payload?.control_id
  }

  get state() {
    return this._payload?.state
  }

  /** @internal */
  protected setPayload(payload: CallingCallRecordEventParams) {
    this._payload = payload
  }

  async stop() {
    await this.execute({
      method: 'calling.record.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    /**
     * TODO: we should wait for the recording `finished` event to allow
     * the CallRecording/Proxy object to update the payload properly
     */

    return this
  }

  ended() {
    return new Promise<this>((resolve) => {
      this._attachListeners(this.controlId)

      const handler = () => {
        // @ts-expect-error
        this.off('recording.ended', handler)
        // @ts-expect-error
        this.off('recording.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.record()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallRecordWorker`
        resolve(this)
      }
      // @ts-expect-error
      this.once('recording.ended', handler)
      // TODO: review what else to return when `recording.failed` happens.
      // @ts-expect-error
      this.once('recording.failed', handler)

      // Resolve the promise if the recording has already ended
      if (ENDED_STATES.includes(this.state as CallingCallRecordEndState)) {
        handler()
      }
    })
  }
}

export const createCallRecordingObject = (
  params: CallRecordingOptions
): CallRecording => {
  const record = connect<
    CallRecordingEventsHandlerMapping,
    CallRecordingAPI,
    CallRecording
  >({
    store: params.store,
    Component: CallRecordingAPI,
  })(params)

  return record
}
