import { ExecuteParams, PubSubPublishParams, uuid } from '@signalwire/core'
import { BaseNamespace } from '../BaseNamespace'
import { SWClient } from '../SWClient'

export interface BaseChatListenOptions {
  channels: string[]
}

export type BaseChatListenerKeys = keyof Omit<BaseChatListenOptions, 'channels'>

export class BaseChat<
  T extends BaseChatListenOptions
> extends BaseNamespace<any> {
  constructor(options: SWClient) {
    super({ swClient: options })
  }

  public listen(listenOptions: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
        const { channels } = listenOptions
        if (channels?.length < 1) {
          throw new Error(
            'Invalid options: channels should be an array with at least one channel!'
          )
        }
        const unsub = await this.subscribe(listenOptions)
        resolve(unsub)
      } catch (error) {
        reject(error)
      }
    })
  }

  protected async subscribe(listenOptions: T) {
    const { channels, ...listeners } = listenOptions

    const _uuid = uuid()

    // Attach listeners
    this._attachListeners(channels, listeners)

    const listenerKeys = Object.keys(listeners) as Array<BaseChatListenerKeys>
    const events: string[] = []
    listenerKeys.forEach((key) => {
      if (this._eventMap[key]) events.push(this._eventMap[key])
    })
    await this.addChannels(channels, events)

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Remove the channels
          const channelsToRemove = channels.filter(
            (channel) => !this.hasOtherListeners(_uuid, channel)
          )
          if (channelsToRemove.length > 0) {
            await this.removeChannels(channelsToRemove)
          }

          // Detach listeners
          this._detachListeners(channels, listeners)

          // Remove channels from the listener map
          this.removeFromListenerMap(_uuid)

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    this._listenerMap.set(_uuid, {
      topics: new Set([...channels]),
      listeners,
      unsub,
    })

    return unsub
  }

  private addChannels(channels: string[], events: string[]) {
    return new Promise(async (resolve, reject) => {
      try {
        const execParams: ExecuteParams = {
          method: 'chat.subscribe',
          params: {
            channels: channels.map((channel) => ({
              name: channel,
            })),
            events,
          },
        }

        // @TODO: Do not subscribe if the user params are the same

        await this._client.execute(execParams)
        resolve(undefined)
      } catch (error) {
        reject(error)
      }
    })
  }

  private removeChannels(channels: string[]) {
    return new Promise(async (resolve, reject) => {
      try {
        const execParams: ExecuteParams = {
          method: 'chat.unsubscribe',
          params: {
            channels: channels.map((channel) => ({
              name: channel,
            })),
          },
        }

        await this._client.execute(execParams)
        resolve(undefined)
      } catch (error) {
        reject(error)
      }
    })
  }

  public publish(params: PubSubPublishParams) {
    return new Promise((resolve, reject) => {
      try {
        const publish = this._client.execute({
          method: 'chat.publish',
          params,
        })
        resolve(publish)
      } catch (error) {
        reject(error)
      }
    })
  }
}
