import { SWClient } from './SWClient'
import { SWClientOptions } from './types'

export const SignalWire = (options: SWClientOptions): Promise<SWClient> => {
  return new Promise(async (resolve, reject) => {
    const swClient = new SWClient(options)

    try {
      await swClient.connect()
      resolve(swClient)
    } catch (error) {
      reject(error)
    }
  })
}

export type { SWClient } from './SWClient'
export type { SessionAuthStatus } from '@signalwire/core'
export type { SWClientOptions, SWClientSessionListeners } from './types'
