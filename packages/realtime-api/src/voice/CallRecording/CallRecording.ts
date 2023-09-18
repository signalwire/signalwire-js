import {
  VoiceCallRecordingContract,
  CallingCallRecordEndState,
  CallingCallRecordEventParams,
  CallingCallRecordPauseMethodParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  CallRecordingEvents,
  CallRecordingListeners,
  CallRecordingListenersEventsMapping,
} from '../../types'
import { Call } from '../Call'

export interface CallRecordingOptions {
  call: Call
  payload: CallingCallRecordEventParams
  listeners?: CallRecordingListeners
}

const ENDED_STATES: CallingCallRecordEndState[] = ['finished', 'no_input']

export class CallRecording
  extends ListenSubscriber<CallRecordingListeners, CallRecordingEvents>
  implements VoiceCallRecordingContract
{
  public _paused: boolean
  private _payload: CallingCallRecordEventParams
  protected _eventMap: CallRecordingListenersEventsMapping = {
    onStarted: 'recording.started',
    onUpdated: 'recording.updated',
    onFailed: 'recording.failed',
    onEnded: 'recording.ended',
  }

  constructor(options: CallRecordingOptions) {
    super({ swClient: options.call._sw })

    this._payload = options.payload
    this._paused = false

    if (options.listeners) {
      this.listen(options.listeners)
    }
  }

  get id() {
    return this._payload.control_id
  }

  get callId() {
    return this._payload.call_id
  }

  get nodeId() {
    return this._payload.node_id
  }

  get controlId() {
    return this._payload.control_id
  }

  get state() {
    return this._payload.state
  }

  get url() {
    return this._payload.url
  }

  get size() {
    return this._payload.size
  }

  get duration() {
    return this._payload.duration
  }

  get record() {
    return this._payload.record
  }

  get hasEnded() {
    if (ENDED_STATES.includes(this.state as CallingCallRecordEndState)) {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: CallingCallRecordEventParams) {
    this._payload = payload
  }

  async pause(params?: CallingCallRecordPauseMethodParams) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    const { behavior = 'silence' } = params || {}

    await this._client.execute({
      method: 'calling.record.pause',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
        behavior,
      },
    })

    return this
  }

  async resume() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.record.resume',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'calling.record.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        this.off('recording.ended', handler)
        this.off('recording.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload. `this` is the instance created by the
        // `voiceCallRecordWorker` (singleton per
        // `call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallRecordWorker`
        resolve(this)
      }
      this.once('recording.ended', handler)
      this.once('recording.failed', handler)

      // Resolve the promise if the recording has already ended
      if (this.hasEnded) {
        handler()
      }
    })
  }
}
