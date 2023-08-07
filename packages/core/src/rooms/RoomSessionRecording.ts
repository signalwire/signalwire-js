import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptionsWithPayload } from '../utils/interfaces'
import type {
  VideoRecordingContract,
  VideoRecordingEventNames,
  VideoRecordingEventParams,
  VideoRecordingMethods,
} from '../types/videoRecording'

/**
 * Represents a specific recording of a room session.
 */
export interface RoomSessionRecording extends VideoRecordingContract {
  setPayload(payload: VideoRecordingEventParams): void
}

export type RoomSessionRecordingEventsHandlerMapping = Record<
  VideoRecordingEventNames,
  (recording: RoomSessionRecording) => void
>

export interface RoomSessionRecordingOptions
  extends BaseComponentOptionsWithPayload<VideoRecordingEventParams> {}

export class RoomSessionRecordingAPI
  extends BaseComponent<RoomSessionRecordingEventsHandlerMapping>
  implements VideoRecordingMethods
{
  private _payload: VideoRecordingEventParams

  constructor(options: RoomSessionRecordingOptions) {
    super(options)

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

  /** @internal */
  protected setPayload(payload: VideoRecordingEventParams) {
    this._payload = payload
  }

  async pause() {
    await this.execute({
      method: 'video.recording.pause',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }

  async resume() {
    await this.execute({
      method: 'video.recording.resume',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }

  async stop() {
    await this.execute({
      method: 'video.recording.stop',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }
}

export const createRoomSessionRecordingObject = (
  params: RoomSessionRecordingOptions
): RoomSessionRecording => {
  const recording = connect<
    RoomSessionRecordingEventsHandlerMapping,
    RoomSessionRecordingAPI,
    RoomSessionRecording
  >({
    store: params.store,
    Component: RoomSessionRecordingAPI,
  })(params)

  return recording
}
