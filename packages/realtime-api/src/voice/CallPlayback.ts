import {
  connect,
  VoiceCallPlaybackContract,
  CallingCallPlayEndState,
  CallingCallPlayEventParams,
  BaseConsumer,
  BaseComponentOptionsWithPayload,
  EventEmitter,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., pause, resume, stop) the
 * playback inside a Voice Call. You can obtain instances of this class by
 * starting a playback from the desired {@link Call} (see
 * {@link Call.play})
 */
export interface CallPlayback extends VoiceCallPlaybackContract {
  setPayload: (payload: CallingCallPlayEventParams) => void
  _paused: boolean
  /** @internal */
  emit(event: EventEmitter.EventNames<any>, ...args: any[]): void
}

// export type CallPlaybackEventsHandlerMapping = Record<
//   VideoPlaybackEventNames,
//   (playback: CallPlayback) => void
// >
export type CallPlaybackEventsHandlerMapping = {}

export interface CallPlaybackOptions
  extends BaseComponentOptionsWithPayload<CallingCallPlayEventParams> {}

const ENDED_STATES: CallingCallPlayEndState[] = ['finished', 'error']

export class CallPlaybackAPI
  extends BaseConsumer<CallPlaybackEventsHandlerMapping>
  implements VoiceCallPlaybackContract
{
  public _paused: boolean
  private _volume: number
  private _payload: CallingCallPlayEventParams

  constructor(options: CallPlaybackOptions) {
    super(options)

    this._payload = options.payload
    this._paused = false
  }

  get id() {
    return this._payload?.control_id.split('.')[0]
  }

  get volume() {
    return this._volume
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
  protected setPayload(payload: CallingCallPlayEventParams) {
    this._payload = payload
  }

  async pause() {
    await this.execute({
      method: 'calling.play.pause',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async resume() {
    await this.execute({
      method: 'calling.play.resume',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async stop() {
    await this.execute({
      method: 'calling.play.stop',
      params: {
        node_id: this.nodeId,
        call_id: this.callId,
        control_id: this.controlId,
      },
    })

    return this
  }

  async setVolume(volume: number) {
    this._volume = volume

    await this.execute({
      method: 'calling.play.volume',
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
  waitForEnded() {
    return this.ended()
  }

  ended() {
    return new Promise<this>((resolve) => {
      const handler = () => {
        // @ts-expect-error
        this.off('playback.ended', handler)
        // @ts-expect-error
        this.off('playback.failed', handler)
        // It's important to notice that we're returning
        // `this` instead of creating a brand new instance
        // using the payload + EventEmitter Transform
        // pipeline. `this` is the instance created by the
        // `Call` Emitter Transform pipeline (singleton per
        // `Call.play()`) that gets auto updated (using
        // the latest payload per event) by the
        // `voiceCallPlayWorker`
        resolve(this)
      }
      // @ts-expect-error
      this.once('playback.ended', handler)
      // @ts-expect-error
      this.once('playback.failed', handler)

      // Resolve the promise if the recording has already ended
      if (ENDED_STATES.includes(this.state as CallingCallPlayEndState)) {
        handler()
      }
    })
  }
}

export const createCallPlaybackObject = (
  params: CallPlaybackOptions
): CallPlayback => {
  const playback = connect<
    CallPlaybackEventsHandlerMapping,
    CallPlaybackAPI,
    CallPlayback
  >({
    store: params.store,
    Component: CallPlaybackAPI,
  })(params)

  return playback
}
