import {
  BaseComponentOptions,
  BaseConsumer,
  VideoManagerRoomEventNames,
  InternalVideoManagerRoomEventNames,
  connect,
  ConsumerContract,
  EventTransform,
  toExternalJSON,
  VideoManagerRoomEntity,
  VideoManagerRoomsSubscribedEventParams,
} from '@signalwire/core'
import { videoManagerWorker } from './workers'

type EmitterTransformsEvents = InternalVideoManagerRoomEventNames

/** @internal */
export type VideoManagerEvents = Record<
  VideoManagerRoomEventNames,
  (room: VideoManagerRoomEntity) => void
>

/** @internal */
export interface VideoManager extends ConsumerContract<VideoManagerEvents> {}

/** @internal */
export class VideoManagerAPI extends BaseConsumer<VideoManagerEvents> {
  protected _eventsPrefix = 'video-manager' as const

  constructor(options: BaseComponentOptions<VideoManagerEvents>) {
    super(options)

    this.setWorker('videoManagerWorker', {
      worker: videoManagerWorker,
    })
    this.attachWorkers()
  }

  /** @internal */
  getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        ['video-manager.rooms.subscribed'],
        {
          type: 'roomSession',
          // For now we expose the transformed payload and not a RoomSession
          instanceFactory: ({
            rooms,
          }: VideoManagerRoomsSubscribedEventParams) => ({
            rooms: rooms.map((row) => toExternalJSON(row)),
          }),
          payloadTransform: ({
            rooms,
          }: VideoManagerRoomsSubscribedEventParams) => ({
            rooms: rooms.map((row) => toExternalJSON(row)),
          }),
        },
      ],
      [
        [
          'video-manager.room.started',
          'video-manager.room.added',
          'video-manager.room.updated',
          'video-manager.room.ended',
          'video-manager.room.deleted',
        ],
        {
          type: 'roomSession',
          // For now we expose the transformed payload and not a RoomSession
          instanceFactory: (payload) => toExternalJSON(payload),
          payloadTransform: (payload) => toExternalJSON(payload),
        },
      ],
    ])
  }
}

export const createVideoManagerObject = (
  params: BaseComponentOptions<VideoManagerEvents>
) => {
  const manager = connect<VideoManagerEvents, VideoManagerAPI, VideoManager>({
    store: params.store,
    Component: VideoManagerAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  const proxy = new Proxy<VideoManager>(manager, {
    get(
      target: VideoManager,
      property: string | symbol,
      receiver: ProxyHandler<VideoManager>
    ) {
      if (property === '_eventsNamespace') {
        return ''
      } else if (property === 'eventChannel') {
        return 'video-manager.rooms'
      }

      return Reflect.get(target, property, receiver)
    },
  })
  return proxy
}
