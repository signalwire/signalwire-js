import { EventTransform } from '..'

/**
 * Used for serializing Proxies when calling
 * Proxy.toString()
 */
const proxyToString = <T>({
  property,
  payload,
}: {
  property: Function | T
  payload: unknown
}) => {
  return typeof property === 'function'
    ? () => JSON.stringify(payload)
    : property
}

interface ProxyFactoryOptions {
  instance: any
  transform: EventTransform
  payload: unknown
  transformedPayload: any
}

export const proxyFactory = ({
  instance,
  transform,
  payload,
  transformedPayload,
}: ProxyFactoryOptions) => {
  const proxiedObj = new Proxy(instance, {
    get(target: any, prop: any, receiver: any) {
      if (prop === 'toString') {
        return proxyToString({
          property: target[prop],
          payload: transformedPayload,
        })
      } else if (
        prop === '_eventsNamespace' &&
        transform.getInstanceEventNamespace
      ) {
        return transform.getInstanceEventNamespace(payload)
      } else if (prop === 'eventChannel' && transform.getInstanceEventChannel) {
        return transform.getInstanceEventChannel(payload)
      } else if (prop in transformedPayload) {
        return transformedPayload[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  return proxiedObj
}
