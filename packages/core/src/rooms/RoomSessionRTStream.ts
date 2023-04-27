import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'
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

export class RoomSessionRTStreamAPI
  extends BaseComponent<RoomSessionRTStreamEventsHandlerMapping>
  implements VideoStreamMethods
{
  private _payload: VideoStreamEventParams

  constructor(
    options: BaseComponentOptions<RoomSessionRTStreamEventsHandlerMapping>
  ) {
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
    return this._payload.stream.started_at
  }

  get endedAt() {
    return this._payload.stream.ended_at
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
  params: BaseComponentOptions<RoomSessionRTStreamEventsHandlerMapping>
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
