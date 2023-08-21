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
export interface RoomSessionStream extends VideoStreamContract {
  setPayload(payload: VideoStreamEventParams): void
}

export type RoomSessionStreamEventsHandlerMapping = Record<
  VideoStreamEventNames,
  (stream: RoomSessionStream) => void
>

export interface RoomSessionStreamOptions
  extends BaseComponentOptionsWithPayload<VideoStreamEventParams> {}

export class RoomSessionStreamAPI
  extends BaseComponent<RoomSessionStreamEventsHandlerMapping>
  implements VideoStreamMethods
{
  private _payload: VideoStreamEventParams

  constructor(options: RoomSessionStreamOptions) {
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

export const createRoomSessionStreamObject = (
  params: RoomSessionStreamOptions
): RoomSessionStream => {
  const stream = connect<
    RoomSessionStreamEventsHandlerMapping,
    RoomSessionStreamAPI,
    RoomSessionStream
  >({
    store: params.store,
    Component: RoomSessionStreamAPI,
  })(params)

  return stream
}
