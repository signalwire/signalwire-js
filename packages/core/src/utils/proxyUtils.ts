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

const blackListedMethods = ['_destroyer']

const getAllMethods = (objTarget: any): Record<string, Function> => {
  let methods: Record<string, Function> = {}
  let obj = objTarget
  let shouldContinue = true
  while (shouldContinue) {
    Object.getOwnPropertyNames(obj).forEach((k) => {
      if (
        typeof objTarget[k] === 'function' &&
        typeof k === 'string' &&
        !blackListedMethods.includes(k) &&
        // If the method was already defined it means we can
        // safely skip since it was overwritten
        !(k in methods)
      ) {
        methods[k] = objTarget[k]
      }
    })

    if (!obj || !obj.__sw_symbol) {
      shouldContinue = false
    } else {
      obj = Object.getPrototypeOf(obj)
    }
  }

  return methods
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
        // We mostly need this for our tests where we're
        // overwritting things like `execute`.
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
