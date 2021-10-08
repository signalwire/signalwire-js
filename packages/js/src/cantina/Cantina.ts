import { BaseConsumer, connect, ConsumerContract, EventTransform, InternalUserOptions, toExternalJSON } from '@signalwire/core'
import { SDKStore } from '@signalwire/core/src/redux'
import { createBaseRoomSessionObject } from '../BaseRoomSession';
import { RoomSession } from "../RoomSession";

type CantinaNameSpace = 'cantina-manager'
type CantinaEvents = 'room.started' | 'room.updated' | 'room.ended'

type PrefixedEvent<T extends CantinaEvents> = `${CantinaNameSpace}.${T}`

type CantinaNamespacedEvents = PrefixedEvent<CantinaEvents>


/** @internal */
export type CantinaManagerEvents = Record<CantinaEvents, (room: RoomSession) => void>

/** @internal */
export interface Cantina extends ConsumerContract<CantinaManagerEvents> {
  /** @internal */
  subscribe(): Promise<void>
}

/** @internal */
export class CantinaAPI extends BaseConsumer<CantinaManagerEvents> {
  // @ts-expect-error
  protected _eventsPrefix = 'cantina-manager'

  /** @internal */
  getEmitterTransforms() {
    return new Map<CantinaNamespacedEvents | CantinaNamespacedEvents[], EventTransform>([
      [[
      'cantina-manager.room.started',
      'cantina-manager.room.updated',
      'cantina-manager.room.ended',
      ], {
        type: 'roomSession',
        instanceFactory: () => {
          return createBaseRoomSessionObject<RoomSession>({
            store: this.store,
            // @ts-expect-error
            emitter: this.emitter,
         })
        },
        payloadTransform: (payload) => toExternalJSON(payload),
      }]
    ])
  }
}

export interface CantinaOptions extends InternalUserOptions {
  store: SDKStore
}
export const createCantinaObject = (options: CantinaOptions) => {
  const {
    store,
    ...userOptions
  } = options
  const cantina = connect<
    CantinaEvents,
    // @ts-expect-error
    CantinaAPI,
    Cantina>({
      store: options.store,
      Component: CantinaAPI
    })(userOptions)
  const proxy = new Proxy(cantina, {
    get(target: Cantina, property: string | symbol, receiver: ProxyHandler<Cantina>) {
      if (property === '_eventsNamespace') {
        return ''
      }

      if (property === 'eventChannel') {
        return 'cantina-manager.rooms'
      }
      return Reflect.get(target, property, receiver)
    }
  })
  return proxy
}

