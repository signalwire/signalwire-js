import {
  BaseComponentOptions,
  BaseConsumer,
  CantinaEvents,
  CantinaNamespacedEvents,
  connect,
  ConsumerContract,
  EventTransform,
  toExternalJSON,
} from '@signalwire/core'
import { createBaseRoomSessionObject } from '../BaseRoomSession'
import { RoomSession } from '../RoomSession'

/** @internal */
export type CantinaManagerEvents = Record<
  CantinaEvents,
  (room: RoomSession) => void
>

/** @internal */
export interface Cantina extends ConsumerContract<CantinaManagerEvents> {}

/** @internal */
export class CantinaAPI extends BaseConsumer<CantinaManagerEvents> {
  // @ts-expect-error
  protected _eventsPrefix = 'cantina-manager'

  /** @internal */
  getEmitterTransforms() {
    return new Map<
      CantinaNamespacedEvents | CantinaNamespacedEvents[],
      EventTransform
    >([
      [
        [
          'cantina-manager.room.started',
          'cantina-manager.room.updated',
          'cantina-manager.room.ended',
        ],
        {
          type: 'roomSession',
          instanceFactory: () => {
            return createBaseRoomSessionObject<RoomSession>({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload) => toExternalJSON(payload),
        },
      ],
    ])
  }
}

export const createCantinaObject = (
  options: BaseComponentOptions<CantinaEvents>
) => {
  const { store, ...userOptions } = options
  const cantina = connect<
    CantinaEvents,
    // @ts-expect-error
    CantinaAPI,
    Cantina
  >({
    store: options.store,
    Component: CantinaAPI,
  })(userOptions)
  const proxy = new Proxy(cantina, {
    get(
      target: Cantina,
      property: string | symbol,
      receiver: ProxyHandler<Cantina>
    ) {
      if (property === '_eventsNamespace') {
        return ''
      }

      if (property === 'eventChannel') {
        return 'cantina-manager.rooms'
      }
      return Reflect.get(target, property, receiver)
    },
  })
  return proxy
}
