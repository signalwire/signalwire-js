import type { APIMethodsMap } from './interfaces'
import type { ConstructableType } from '../types/utils'

export const extendComponent = <T, M>(
  klass: any,
  methods: APIMethodsMap<M>
) => {
  Object.defineProperties(klass.prototype, methods)

  return klass as ConstructableType<T>
}
