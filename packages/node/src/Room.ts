import {
  BaseComponent,
  BaseComponentOptions,
  Emitter,
  ExecuteParams,
  logger,
} from '@signalwire/core'

interface RoomOptions extends BaseComponentOptions {
  name: string
  id: string
  sessionId: string
  eventChannel: string
}

type RoomEvents = any

export class Room extends BaseComponent {
  // TODO: add proper type
  private _subscriptions: string[] = []

  constructor(public options: RoomOptions) {
    super(options)

    this._attachListeners(options.sessionId)
  }

  get name() {
    return this.options.name
  }

  get roomId() {
    return this.options.id
  }

  private get eventChannel() {
    return this.options.eventChannel
  }

  private setSubscription(event: RoomEvents) {
    this._subscriptions = Array.from(new Set(this._subscriptions.concat(event)))
    return this._subscriptions
  }

  // TODO: hide (at least from docs) methods like .once. etc.

  // TODO: type subscribe to narrow types and handlers
  on(...options: Parameters<Emitter['on']>) {
    this.setSubscription(options[0])
    return super.on(...options)
  }

  run() {
    return new Promise(async (resolve, reject) => {
      if (this._subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: 'signalwire.subscribe',
          params: {
            event_channel: this.eventChannel,
            events: this._subscriptions,
          },
        }

        try {
          await this.execute(execParams)
        } catch (error) {
          return reject(error)
        }
      } else {
        logger.warn('`room.run()` was called without any listeners attached.')
      }

      return resolve(undefined)
    })
  }
}
