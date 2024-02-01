/**
 * Once we have new interface for Browser SDK;
 * RoomSessionStream in core should be removed
 * RoomSessionStream in realtime-api should be moved to core
 */

import type {
  VideoStreamEventParams,
  VideoStreamMethods,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import {
  RealTimeRoomStreamEvents,
  RealTimeRoomStreamListeners,
  RealtimeRoomStreamListenersEventsMapping,
} from '../../types'
import { ListenSubscriber } from '../../ListenSubscriber'

export interface RoomSessionStreamOptions {
  roomSession: RoomSession
  payload: VideoStreamEventParams
}

export class RoomSessionStream
  extends ListenSubscriber<
    RealTimeRoomStreamListeners,
    RealTimeRoomStreamEvents
  >
  implements VideoStreamMethods
{
  private _payload: VideoStreamEventParams
  protected _eventMap: RealtimeRoomStreamListenersEventsMapping = {
    onStarted: 'stream.started',
    onEnded: 'stream.ended',
  }

  constructor(options: RoomSessionStreamOptions) {
    super({ swClient: options.roomSession._sw })

    this._payload = options.payload
  }

  get id() {
    return this._payload.stream.id
  }

  get roomId() {
    return this._payload.room_id
  }

  get roomSessionId() {
    return this._payload.room_session_id
  }

  get state() {
    return this._payload.stream.state
  }

  get duration() {
    return this._payload.stream.duration
  }

  get url() {
    return this._payload.stream.url
  }

  get startedAt() {
    if (!this._payload.stream.started_at) return undefined
    return new Date(
      (this._payload.stream.started_at as unknown as number) * 1000
    )
  }

  get endedAt() {
    if (!this._payload.stream.ended_at) return undefined
    return new Date((this._payload.stream.ended_at as unknown as number) * 1000)
  }

  get hasEnded() {
    if (this.state === 'completed') {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: VideoStreamEventParams) {
    this._payload = payload
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.stream.stop',
      params: {
        room_session_id: this.roomSessionId,
        stream_id: this.id,
      },
    })
  }
}
