import {
  BaseComponentOptions,
  BaseConsumer,
  CantinaRoomEventNames,
  InternalCantinaRoomEventNames,
  connect,
  ConsumerContract,
  EventTransform,
  toExternalJSON,
} from '@signalwire/core'
import { createBaseRoomSessionObject } from '../BaseRoomSession'
import { RoomSession } from '../RoomSession'

/** @internal */
export type CantinaManagerEvents = Record<
  CantinaRoomEventNames,
  (room: RoomSession) => void
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
