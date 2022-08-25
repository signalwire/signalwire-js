import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'
import { OnlyFunctionProperties } from '../types'
import type {
  VideoStreamingContract,
  VideoStreamingEventNames,
} from '../types/videoStreaming'

/**
 * Represents a specific streaming of a room session.
 */
export interface RoomSessionStreaming extends VideoStreamingContract {}

export type RoomSessionStreamingEventsHandlerMapping = Record<
  VideoStreamingEventNames,
  (streaming: RoomSessionStreaming) => void
>

export class RoomSessionStreamingAPI
  extends BaseComponent<RoomSessionStreamingEventsHandlerMapping>
  implements OnlyFunctionProperties<RoomSessionStreaming>
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

export const createRoomSessionStreamingObject = (
  params: BaseComponentOptions<RoomSessionStreamingEventsHandlerMapping>
): RoomSessionStreaming => {
  const streaming = connect<
    RoomSessionStreamingEventsHandlerMapping,
    RoomSessionStreamingAPI,
    RoomSessionStreaming
  >({
    store: params.store,
    Component: RoomSessionStreamingAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return streaming
}
