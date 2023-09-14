import {
  CallingCallCollectEndState,
  CallingCallPlayEndState,
  CallingCallRecordEndState,
} from '@signalwire/core'
import { Call } from './Call'

export interface DecoratePromiseOptions<T> {
  promise: Promise<T>
  namespace: 'playback' | 'recording' | 'prompt'
  endedStates:
    | CallingCallPlayEndState[]
    | CallingCallRecordEndState[]
    | CallingCallCollectEndState[]
  methods: string[]
  getters: string[]
}

export function decoratePromise<T>(
  this: Call,
  options: DecoratePromiseOptions<T>
) {
  const {
    promise: innerPromise,
    namespace,
    endedStates,
    methods,
    getters,
  } = options

  const promise = new Promise<T>((resolve, reject) => {
    const endedHandler = (instance: T) => {
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
      value: async function () {
        return await innerPromise
      },
      enumerable: true,
    },
    onEnded: {
      value: async function () {
        // @ts-expect-error
        if (endedStates.includes(this.state)) {
          return this
        }
        return await promise
      },
      enumerable: true,
    },
    ...methods.reduce((acc: any, method) => {
      acc[method] = {
        value: async function () {
          const playback = await this.onStarted()
          return playback[method]()
        },
        enumerable: true,
      }
      return acc
    }, {}),
    ...getters.reduce((acc: any, gettter) => {
      acc[gettter] = {
        get: async function () {
          const playback = await this.onStarted()
          return playback[gettter]
        },
        enumerable: true,
      }
      return acc
    }, {}),
  })

  return promise
}
