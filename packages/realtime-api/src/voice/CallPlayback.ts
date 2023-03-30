import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  VoiceCallPlaybackContract,
  CallingCallPlayState,
  CallingCallPlayEndState,
} from '@signalwire/core'

/**
 * Instances of this class allow you to control (e.g., pause, resume, stop) the
 * playback inside a Voice Call. You can obtain instances of this class by
 * starting a playback from the desired {@link Call} (see
 * {@link Call.play})
 */
export interface CallPlayback extends VoiceCallPlaybackContract {}

// export type CallPlaybackEventsHandlerMapping = Record<
//   VideoPlaybackEventNames,
//   (playback: CallPlayback) => void
// >
export type CallPlaybackEventsHandlerMapping = {}

export interface CallPlaybackOptions
  extends BaseComponentOptions<CallPlaybackEventsHandlerMapping> {}

const ENDED_STATES: CallingCallPlayEndState[] = ['finished', 'error']

export class CallPlaybackAPI
  extends BaseComponent<CallPlaybackEventsHandlerMapping>
  implements VoiceCallPlaybackContract
{
  protected _eventsPrefix = 'calling' as const

  callId: string
  nodeId: string
  controlId: string
  state: CallingCallPlayState = 'playing'
  private _volume: number

  get id() {
    return this.controlId
  }

  get volume() {
    return this._volume
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
      this._attachListeners(this.controlId)

      const handler = () => {
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
      // // @ts-expect-error
      // this.on('prompt.failed', handler)

      // Resolve the promise if the playback has already ended
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
