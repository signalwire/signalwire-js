import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptionsWithPayload } from '../utils/interfaces'
import type {
  VideoPlaybackContract,
  VideoPlaybackMethods,
  VideoPlaybackEventNames,
  VideoPlaybackEventParams,
} from '../types/videoPlayback'

/**
 * Instances of this class allow you to control (e.g., pause, resume, stop) the
 * playback inside a room session. You can obtain instances of this class by
 * starting a playback from the desired {@link RoomSession} (see
 * {@link RoomSession.play})
 */
export interface RoomSessionPlayback extends VideoPlaybackContract {
  setPayload(payload: VideoPlaybackEventParams): void
}

export type RoomSessionPlaybackEventsHandlerMapping = Record<
  VideoPlaybackEventNames,
  (playback: RoomSessionPlayback) => void
>

export interface RoomSessionPlaybackOptions
  extends BaseComponentOptionsWithPayload<VideoPlaybackEventParams> {}

export class RoomSessionPlaybackAPI
  extends BaseComponent<RoomSessionPlaybackEventsHandlerMapping>
  implements VideoPlaybackMethods
{
  private _payload: VideoPlaybackEventParams

  constructor(options: RoomSessionPlaybackOptions) {
    super(options)

    this._payload = options.payload
  }

  get id() {
    return this._payload.playback.id
  }

  get roomId() {
    return this._payload.room_id
  }

  get roomSessionId() {
    return this._payload.room_session_id
  }

  get url() {
    return this._payload.playback.url
  }

  get state() {
    return this._payload.playback.state
  }

  get volume() {
    return this._payload.playback.volume
  }

  get startedAt() {
    if (!this._payload.playback.started_at) return undefined
    return new Date(
      (this._payload.playback.started_at as unknown as number) * 1000
    )
  }

  get endedAt() {
    if (!this._payload.playback.ended_at) return undefined
    return new Date(
      (this._payload.playback.ended_at as unknown as number) * 1000
    )
  }

  get position() {
    return this._payload.playback.position
  }

  get seekable() {
    return this._payload.playback.seekable
  }

  /** @internal */
  protected setPayload(payload: VideoPlaybackEventParams) {
    this._payload = payload
  }

  async pause() {
    await this.execute({
      method: 'video.playback.pause',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
      },
    })
  }

  async resume() {
    await this.execute({
      method: 'video.playback.resume',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
      },
    })
  }

  async stop() {
    await this.execute({
      method: 'video.playback.stop',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
      },
    })
  }

  async setVolume(volume: number) {
    await this.execute({
      method: 'video.playback.set_volume',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
        volume,
      },
    })
  }

  async seek(timecode: number) {
    await this.execute({
      method: 'video.playback.seek_absolute',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
        position: Math.abs(timecode),
      },
    })
  }

  async forward(offset: number = 5000) {
    await this.execute({
      method: 'video.playback.seek_relative',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
        position: Math.abs(offset),
      },
    })
  }

  async rewind(offset: number = 5000) {
    await this.execute({
      method: 'video.playback.seek_relative',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        playback_id: this.getStateProperty('id'),
        position: -Math.abs(offset),
      },
    })
  }
}

export const createRoomSessionPlaybackObject = (
  params: RoomSessionPlaybackOptions
): RoomSessionPlayback => {
  const playback = connect<
    RoomSessionPlaybackEventsHandlerMapping,
    RoomSessionPlaybackAPI,
    RoomSessionPlayback
  >({
    store: params.store,
    Component: RoomSessionPlaybackAPI,
  })(params)

  return playback
}
