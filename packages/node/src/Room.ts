import {
  BaseComponent,
  BaseComponentOptions,
  Emitter,
  ExecuteParams,
  logger,
} from '@signalwire/core'

interface RoomOptions extends BaseComponentOptions {
  name: string
  roomId: string
  roomSessionId: string
  eventChannel: string
}

type RoomEvents = any

export class Room extends BaseComponent {
  // TODO: add proper type
  private _subscriptions: string[] = []

  constructor(public options: RoomOptions) {
    super(options)

    this._attachListeners(options.roomSessionId)
  }

  get name() {
    return this.options.name
  }

  get roomId() {
    return this.options.roomId
  }

  get roomSessionId() {
    return this.options.roomSessionId
  }

  get eventChannel() {
    return this.options.eventChannel
  }

  private setSubscription(event: RoomEvents) {
    this._subscriptions = Array.from(new Set(this._subscriptions.concat(event)))
    return this._subscriptions
  }

  // TODO: hide .on, .off. etc. For this we might need to split
  // BaseComponent to support 2 different APIs for the base Emitter

  // TODO: type subscribe to narrow types and handlers
  subscribe(...options: Parameters<Emitter['on']>) {
    this.on(...options)
    this.setSubscription(options[0])
  }

  run() {
    return new Promise(async (resolve, reject) => {
      if (this._subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: 'signalwire.subscribe',
          params: {
            event_channel: this.eventChannel,
            // get_initial_state: true,
            // events: this._subscriptions,
            events: this._subscriptions.map((sub) => {
              return sub.replace('video.', '')
            }),
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
