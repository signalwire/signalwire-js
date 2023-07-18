import {
  BaseComponentOptions,
  VideoManagerRoomEventNames,
  connect,
  ConsumerContract,
  VideoManagerRoomEntity,
  EventEmitter,
  ApplyEventListeners,
} from '@signalwire/core'
import { videoManagerWorker } from './workers'

/** @internal */
export type VideoManagerEvents = Record<
  VideoManagerRoomEventNames,
  (room: VideoManagerRoomEntity) => void
>

/** @internal */
export interface VideoManager extends ConsumerContract<VideoManagerEvents> {
  baseEmitter: EventEmitter
}

/** @internal */
export class VideoManagerAPI extends ApplyEventListeners<VideoManagerEvents> {
  protected _eventsPrefix = 'video-manager' as const

  constructor(options: BaseComponentOptions<VideoManagerEvents>) {
    super(options)

    this.runWorker('videoManagerWorker', {
      worker: videoManagerWorker,
    })
  }
}

export const createVideoManagerObject = (
  params: BaseComponentOptions<VideoManagerEvents>
) => {
  const manager = connect<VideoManagerEvents, VideoManagerAPI, VideoManager>({
    store: params.store,
    Component: VideoManagerAPI,
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
