const getAllMethods = (objTarget: any): Record<string, Function> => {
  let methods: Record<string, Function> = {}
  let obj = objTarget
  let shouldContinue = true
  while (shouldContinue) {
    Object.getOwnPropertyNames(obj).forEach((k) => {
      if (
        typeof objTarget[k] === 'function' &&
        typeof k === 'string' &&
        // If the method was already defined it means we can
        // safely skip it since it was overwritten
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
  transformedPayload,
  transform,
}: {
  instance: any
  proxiedObj: any
  payload: any
  transformedPayload: any
  transform: any
}) => {
  const data = {
    ...transformedPayload,
    /**
     * We manually add `_eventsNamespace` and `eventChannel`
     * as an attempt to make this object as close as Proxy,
     * but `_eventsNamespace` is actually required when
     * using `instance` inside of workers. Without this the
     * events will be queued because `_eventsNamespace` is
     * undefined.
     */
    _eventsNamespace: transform.getInstanceEventNamespace
      ? transform.getInstanceEventNamespace(payload)
      : undefined,
    eventChannel: transform.getInstanceEventChannel
      ? transform.getInstanceEventChannel(payload)
      : undefined,
    ...getAllMethods(instance),
  }

  return Object.defineProperties(
    proxiedObj,
    Object.entries(data).reduce((reducer, [key, value]) => {
      if (value === undefined) {
        return reducer
      }

      reducer[key] = {
        value,
        enumerable: true,
        configurable: true,
        /**
         * We mostly need this for our tests where we're
         * overwritting things like `execute`.
         */
        writable: true,
      }

      return reducer
    }, {} as Record<string, PropertyDescriptor>)
  )
}
