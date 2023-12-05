import {
  EventEmitter,
  ExecuteParams,
  PubSubPublishParams,
  uuid,
} from '@signalwire/core'
import { BaseNamespace, Listeners } from '../BaseNamespace'

export interface BaseChatListenOptions {
  channels: string[]
}

export class BaseChat<
  T extends BaseChatListenOptions,
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseNamespace<T, EventTypes> {
  public listen(listenOptions: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
        const { channels } = listenOptions
        if (!Array.isArray(channels) || channels?.length < 1) {
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
    this._attachListenersWithTopics(channels, listeners as Listeners<T>)

    const listenerKeys = Object.keys(listeners)
    const events: string[] = []
    listenerKeys.forEach((key) => {
      const _key = key as keyof Listeners<T>
      if (this._eventMap[_key]) events.push(this._eventMap[_key] as string)
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
          this._detachListenersWithTopics(channels, listeners as Listeners<T>)

          // Remove channels from the listener map
          this.removeFromListenerMap(_uuid)

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    // Add channels to the listener map
    this.addToListenerMap(_uuid, {
      topics: new Set([...channels]),
      listeners: listeners as Listeners<T>,
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
