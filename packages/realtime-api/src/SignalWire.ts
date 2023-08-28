import { SWClient, SWClientOptions } from './SWClient'

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
export type { Chat } from './chat/Chat'
export type { PubSub } from './pubSub/PubSub'
export type { Task } from './task/Task'
