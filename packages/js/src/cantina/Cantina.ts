import {
  BaseComponentOptions,
  BaseConsumer,
  CantinaRoomEventNames,
  InternalCantinaRoomEventNames,
  connect,
  ConsumerContract,
  EventTransform,
  toExternalJSON,
  CantinaRoomEntity,
} from '@signalwire/core'

/** @internal */
export type CantinaManagerEvents = Record<
  CantinaRoomEventNames,
  (room: CantinaRoomEntity) => void
>

/** @internal */
export interface Cantina extends ConsumerContract<CantinaManagerEvents> {}

/** @internal */
export class CantinaAPI extends BaseConsumer<CantinaManagerEvents> {
  protected _eventsPrefix = 'cantina-manager' as const

  /** @internal */
  getEmitterTransforms() {
    return new Map<
      InternalCantinaRoomEventNames | InternalCantinaRoomEventNames[],
      EventTransform
    >([
      [
        [
          'cantina-manager.room.started',
          'cantina-manager.room.added',
          'cantina-manager.room.updated',
          'cantina-manager.room.ended',
          'cantina-manager.room.deleted',
        ],
        {
          type: 'roomSession',
          instanceFactory: (payload) => toExternalJSON(payload),
          payloadTransform: (payload) => toExternalJSON(payload),
        },
      ],
    ])
  }
}

export const createCantinaObject = (
  params: BaseComponentOptions<CantinaManagerEvents>
) => {
  const cantina = connect<CantinaManagerEvents, CantinaAPI, Cantina>({
    store: params.store,
    Component: CantinaAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  const proxy = new Proxy<Cantina>(cantina, {
    get(
      target: Cantina,
      property: string | symbol,
      receiver: ProxyHandler<Cantina>
    ) {
      if (property === '_eventsNamespace') {
        return ''
      } else if (property === 'eventChannel') {
        return 'cantina-manager.rooms'
      }

      return Reflect.get(target, property, receiver)
    },
  })
  return proxy
}
