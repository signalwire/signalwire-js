/**
 * `RoomSessionRecording.ts`   -> Uses old event emitter - being used in browser SDK
 * `RoomSessionRTRecording.ts` -> Uses new event emitter - being used in realtime SDK
 *
 * The `RoomSessionRTRecording.ts` file should be removed when we start using the new event emitter in browser sdk.
 * We will also need to rename the new file and remove the letters `RT` from all the variables/classes/functions/types.
 */

import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'
import type {
  VideoRecordingContract,
  VideoRecordingEventNames,
  VideoRecordingEventParams,
  VideoRecordingMethods,
} from '../types/videoRecording'

/**
 * Represents a specific recording of a room session.
 */
export interface RoomSessionRTRecording extends VideoRecordingContract {
  setPayload(payload: VideoRecordingEventParams): void
}

export type RoomSessionRTRecordingEventsHandlerMapping = Record<
  VideoRecordingEventNames,
  (recording: RoomSessionRTRecording) => void
>

export class RoomSessionRTRecordingAPI
  extends BaseComponent<RoomSessionRTRecordingEventsHandlerMapping>
  implements VideoRecordingMethods
{
  private _payload: VideoRecordingEventParams

  constructor(
    options: BaseComponentOptions<RoomSessionRTRecordingEventsHandlerMapping>
  ) {
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
    return this._payload.recording.started_at
  }

  get endedAt() {
    return this._payload.recording.ended_at
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

export const createRoomSessionRTRecordingObject = (
  params: BaseComponentOptions<RoomSessionRTRecordingEventsHandlerMapping>
): RoomSessionRTRecording => {
  const recording = connect<
    RoomSessionRTRecordingEventsHandlerMapping,
    RoomSessionRTRecordingAPI,
    RoomSessionRTRecording
  >({
    store: params.store,
    Component: RoomSessionRTRecordingAPI,
  })(params)

  return recording
}
