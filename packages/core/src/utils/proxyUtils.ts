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

const getAllMethods = (objTarget: any): Record<string, Function> => {
  let methods = new Set<string>()
  let obj = objTarget
  let shouldContinue = true
  while (shouldContinue) {
    let keys = Reflect.ownKeys(obj)
    keys.forEach(
      (k) => typeof objTarget[k] === 'function' && methods.add(k as string)
    )

    // TODO: check if there's another way to "stop" at
    // BaseComponent or BaseSession
    if (!(obj.hasOwnProperty('__uuid') || obj.hasOwnProperty('uuid'))) {
      shouldContinue = false
    } else {
      obj = Reflect.getPrototypeOf(obj)
    }
  }

  return Array.from(methods).reduce((reducer, method) => {
    reducer[method] = objTarget[method]
    return reducer
  }, {} as Record<string, Function>)
}

export const serializeableProxy = ({
  instance,
  proxiedObj,
  payload,
}: {
  instance: any
  proxiedObj: any
  payload: any
}) => {
  const data = {
    ...payload,
    ...getAllMethods(instance),
  }
  return Object.defineProperties(
    proxiedObj,
    Object.entries(data).reduce((reducer, [key, value]) => {
      reducer[key] = {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      }

      return reducer
    }, {} as Record<string, PropertyDescriptor>)
  )
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

  /**
   * This is just for helping users have a better experience
   * when using console.log to debug the Proxy.
   */
  return serializeableProxy({
    instance,
    proxiedObj,
    payload: transformedPayload,
  })
}
