import { APIMethodsMap, ConstructableType } from '@signalwire/core'

export const extendComponent = <T, M>(
  klass: any,
  methods: APIMethodsMap<M>
) => {
  Object.defineProperties(klass.prototype, methods)

  return klass as ConstructableType<T>
}
