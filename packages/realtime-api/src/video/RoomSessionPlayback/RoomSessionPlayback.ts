/**
 * Once we have new interface for Browser SDK;
 * RoomSessionPlayback in core should be removed
 * RoomSessionPlayback in realtime-api should be moved to core
 */

import type {
  VideoPlaybackContract,
  VideoPlaybackEventParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import {
  RealTimeRoomPlaybackEvents,
  RealTimeRoomPlaybackListeners,
  RealtimeRoomPlaybackListenersEventsMapping,
} from '../../types'
import { RoomSession } from '../RoomSession'

/**
 * Instances of this class allow you to control (e.g., pause, resume, stop) the
 * playback inside a room session. You can obtain instances of this class by
 * starting a playback from the desired {@link RoomSession} (see
 * {@link RoomSession.play})
 */

export interface RoomSessionPlaybackOptions {
  roomSession: RoomSession
  payload: VideoPlaybackEventParams
}

export class RoomSessionPlayback
  extends ListenSubscriber<
    RealTimeRoomPlaybackListeners,
    RealTimeRoomPlaybackEvents
  >
  implements VideoPlaybackContract
{
  private _payload: VideoPlaybackEventParams
  protected _eventMap: RealtimeRoomPlaybackListenersEventsMapping = {
    onStarted: 'playback.started',
    onUpdated: 'playback.updated',
    onEnded: 'playback.ended',
  }

  constructor(options: RoomSessionPlaybackOptions) {
    super({ swClient: options.roomSession._sw })

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

  get hasEnded() {
    if (this.state === 'completed') {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: VideoPlaybackEventParams) {
    this._payload = payload
  }

  async pause() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.pause',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
      },
    })
  }

  async resume() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.resume',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
      },
    })
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.stop',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
      },
    })
  }

  async setVolume(volume: number) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.set_volume',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
        volume,
      },
    })
  }

  async seek(timecode: number) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.seek_absolute',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
        position: Math.abs(timecode),
      },
    })
  }

  async forward(offset: number = 5000) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.seek_relative',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
        position: Math.abs(offset),
      },
    })
  }

  async rewind(offset: number = 5000) {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.playback.seek_relative',
      params: {
        room_session_id: this.roomSessionId,
        playback_id: this.id,
        position: -Math.abs(offset),
      },
    })
  }
}
