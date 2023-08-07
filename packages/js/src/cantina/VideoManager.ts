import {
  BaseComponentOptions,
  VideoManagerRoomEventNames,
  connect,
  ConsumerContract,
  VideoManagerRoomEntity,
  validateEventsToSubscribe,
  EventEmitter,
  BaseConsumer,
} from '@signalwire/core'
import { videoManagerWorker } from './workers'

/** @internal */
export type VideoManagerEvents = Record<
  VideoManagerRoomEventNames,
  (room: VideoManagerRoomEntity) => void
>

/** @internal */
export interface VideoManager extends ConsumerContract<VideoManagerEvents> {}

/** @internal */
export class VideoManagerAPI extends BaseConsumer<VideoManagerEvents> {
  constructor(options: BaseComponentOptions) {
    super(options)

    this.runWorker('videoManagerWorker', {
      worker: videoManagerWorker,
    })
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video-manager.${event}`
    ) as EventEmitter.EventNames<VideoManagerEvents>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }
}

export const createVideoManagerObject = (params: BaseComponentOptions) => {
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
