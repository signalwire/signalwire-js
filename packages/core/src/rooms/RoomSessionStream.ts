import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'
import { OnlyFunctionProperties } from '../types'
import type {
  VideoStreamContract,
  VideoStreamEventNames,
} from '../types/videoStream'

/**
 * Represents a specific Stream of a room session.
 */
export interface RoomSessionStream extends VideoStreamContract {}

export type RoomSessionStreamEventsHandlerMapping = Record<
  VideoStreamEventNames,
  (stream: RoomSessionStream) => void
>

export class RoomSessionStreamAPI
  extends BaseComponent<RoomSessionStreamEventsHandlerMapping>
  implements OnlyFunctionProperties<RoomSessionStream>
{
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
  params: BaseComponentOptions<RoomSessionStreamEventsHandlerMapping>
): RoomSessionStream => {
  const stream = connect<
    RoomSessionStreamEventsHandlerMapping,
    RoomSessionStreamAPI,
    RoomSessionStream
  >({
    store: params.store,
    Component: RoomSessionStreamAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return stream
}
