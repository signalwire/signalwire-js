import { Call } from './voice/Call'
import { RoomSession } from './video/RoomSession'

export interface DecoratePromiseOptions<T> {
  promise: Promise<T>
  namespace:
    | 'playback'
    | 'recording'
    | 'prompt'
    | 'tap'
    | 'detect'
    | 'collect'
    | 'stream'
  methods: string[]
  getters: string[]
}

export function decoratePromise<T, U>(
  this: Call | RoomSession,
  options: DecoratePromiseOptions<T>
): Promise<U> {
  const { promise: innerPromise, namespace, methods, getters } = options

  const promise = new Promise<U>((resolve, reject) => {
    const endedHandler = (instance: U) => {
      // @ts-expect-error
      this.off(`${namespace}.ended`, endedHandler)
      resolve(instance)
    }

    // @ts-expect-error
    this.once(`${namespace}.ended`, endedHandler)

    innerPromise.catch((error) => {
      // @ts-expect-error
      this.off(`${namespace}.ended`, endedHandler)
      reject(error)
    })
  })

  Object.defineProperties(promise, {
    onStarted: {
      value: function () {
        /**
         * Since onStarted is a property of the outer promise.
         * In case the inner promise rejects, the outer promise goes unhandled.
         * Due to this, we need to catch both of the promises.
         */
        return new Promise((resolve, reject) => {
          promise.catch(reject)
          innerPromise.then(resolve).catch(reject)
        })
      },
      enumerable: true,
    },
    onEnded: {
      value: async function () {
        const instance = await this.onStarted()
        if (instance.hasEnded) {
          return this
        }
        return await promise
      },
      enumerable: true,
    },
    listen: {
      value: async function (...args: any) {
        const instance = await this.onStarted()
        return instance.listen(...args)
      },
      enumerable: true,
    },
    ...methods.reduce((acc: Record<string, any>, method) => {
      acc[method] = {
        value: async function (...args: any) {
          const instance = await this.onStarted()
          return instance[method](...args)
        },
        enumerable: true,
      }
      return acc
    }, {}),
    ...getters.reduce((acc: Record<string, any>, gettter) => {
      acc[gettter] = {
        get: async function () {
          const instance = await this.onStarted()
          return instance[gettter]
        },
        enumerable: true,
      }
      return acc
    }, {}),
  })

  return promise
}
