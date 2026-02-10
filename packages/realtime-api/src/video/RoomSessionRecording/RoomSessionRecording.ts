/**
 * Once we have new interface for Browser SDK;
 * RoomSessionRecording in core should be removed
 * RoomSessionRecording in realtime-api should be moved to core
 */

import type {
  VideoRecordingEventParams,
  VideoRecordingMethods,
} from '@signalwire/core'
import {
  RealTimeRoomRecordingEvents,
  RealTimeRoomRecordingListeners,
  RealtimeRoomRecordingListenersEventsMapping,
} from '../../types'
import { ListenSubscriber } from '../../ListenSubscriber'
import { RoomSession } from '../RoomSession'

export interface RoomSessionRecordingOptions {
  roomSession: RoomSession
  payload: VideoRecordingEventParams
}

export class RoomSessionRecording
  extends ListenSubscriber<
    RealTimeRoomRecordingListeners,
    RealTimeRoomRecordingEvents
  >
  implements VideoRecordingMethods
{
  private _payload: VideoRecordingEventParams
  protected _eventMap: RealtimeRoomRecordingListenersEventsMapping = {
    onStarted: 'recording.started',
    onUpdated: 'recording.updated',
    onEnded: 'recording.ended',
  }

  constructor(options: RoomSessionRecordingOptions) {
    super({ swClient: options.roomSession._sw })

    this._payload = options.payload
  }

  get id() {
    return this._payload.recording.id
  }

  get roomId() {
    return this._payload.room_id
  }

  get roomSessionId() {
    return this._payload.room_session_id
  }

  get state() {
    return this._payload.recording.state
  }

  get duration() {
    return this._payload.recording.duration
  }

  get startedAt() {
    if (!this._payload.recording.started_at) return undefined
    return new Date(
      (this._payload.recording.started_at as unknown as number) * 1000
    )
  }

  get endedAt() {
    if (!this._payload.recording.ended_at) return undefined
    return new Date(
      (this._payload.recording.ended_at as unknown as number) * 1000
    )
  }

  get hasEnded() {
    if (this.state === 'completed') {
      return true
    }
    return false
  }

  /** @internal */
  setPayload(payload: VideoRecordingEventParams) {
    this._payload = payload
  }

  async pause() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.recording.pause',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }

  async resume() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.recording.resume',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }

  async stop() {
    if (this.hasEnded) {
      throw new Error('Action has ended')
    }

    await this._client.execute({
      method: 'video.recording.stop',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }
}
