/**
 * `RoomSessionStream.ts`   -> Uses old event emitter - being used in browser SDK
 * `RoomSessionRTStream.ts` -> Uses new event emitter - being used in realtime SDK
 *
 * The `RoomSessionStream.ts` file should be removed when we start using the new event emitter in browser sdk.
 * We will also need to rename the new file and remove the letters `RT` from all the variables/classes/functions/types.
 */

import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptionsWithPayload } from '../utils/interfaces'
import type {
  VideoStreamContract,
  VideoStreamEventNames,
  VideoStreamEventParams,
  VideoStreamMethods,
} from '../types/videoStream'

/**
 * Represents a specific Stream of a room session.
 */
export interface RoomSessionRTStream extends VideoStreamContract {
  setPayload(payload: VideoStreamEventParams): void
}

export type RoomSessionRTStreamEventsHandlerMapping = Record<
  VideoStreamEventNames,
  (stream: RoomSessionRTStream) => void
>

export interface RoomSessionRTStreamOptions
  extends BaseComponentOptionsWithPayload<
    RoomSessionRTStreamEventsHandlerMapping,
    VideoStreamEventParams
  > {}

export class RoomSessionRTStreamAPI
  extends BaseComponent<RoomSessionRTStreamEventsHandlerMapping>
  implements VideoStreamMethods
{
  private _payload: VideoStreamEventParams

  constructor(options: RoomSessionRTStreamOptions) {
    super(options)

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

  /** @internal */
  protected setPayload(payload: VideoStreamEventParams) {
    this._payload = payload
  }

  async stop() {
    await this.execute({
      method: 'video.stream.stop',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        stream_id: this.getStateProperty('id'),
      },
    })
  }
}

export const createRoomSessionRTStreamObject = (
  params: RoomSessionRTStreamOptions
): RoomSessionRTStream => {
  const stream = connect<
    RoomSessionRTStreamEventsHandlerMapping,
    RoomSessionRTStreamAPI,
    RoomSessionRTStream
  >({
    store: params.store,
    Component: RoomSessionRTStreamAPI,
  })(params)

  return stream
}
