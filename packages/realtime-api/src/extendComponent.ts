import { RoomCustomMethods } from '@signalwire/core'

// TODO: move to utils
interface ConstructableT<T> {
  new (o: any): T
}

export const extendComponent = <T, M>(
  klass: any,
  methods: RoomCustomMethods<M>
) => {
  Object.defineProperties(klass.prototype, methods)

  return klass as ConstructableT<T>
}
