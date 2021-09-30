import { EventTransform } from './interfaces'

type ProxyFactoryParams = {
  transform: EventTransform
  payload: Record<any, unknown>
}
const _instanceByTransformKey = new Map<string, EventTransform>()

const getOrCreateInstance = ({ transform, payload }: ProxyFactoryParams) => {
  if (!_instanceByTransformKey.has(transform.key)) {
    const instance = transform.instanceFactory(payload)
    _instanceByTransformKey.set(transform.key, instance)

    return instance
  }

  // @ts-expect-error
  return _instanceByTransformKey.get(internalEvent)
}

export const proxyFactory = ({ transform, payload }: ProxyFactoryParams) => {
  /** Create the instance or pick from cache */
  const cachedInstance = getOrCreateInstance({
    transform,
    payload,
  })

  const transformedPayload = transform.payloadTransform(payload)
  console.log(
    '>> HH',
    transform.key,
    JSON.stringify(transformedPayload, null, 2)
  )
  const proxiedObj = new Proxy(cachedInstance, {
    get(target: any, prop: any, receiver: any) {
      if (prop === '_eventsNamespace' && transform.getInstanceEventNamespace) {
        return transform.getInstanceEventNamespace(payload)
      }
      if (prop === 'eventChannel' && transform.getInstanceEventChannel) {
        return transform.getInstanceEventChannel(payload)
      }

      if (prop in transformedPayload) {
        return transformedPayload[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  return proxiedObj
}
