import {
  BaseComponent,
  BaseComponentOptions,
  Emitter,
  ExecuteParams,
  logger,
} from '@signalwire/core'

interface BaseConsumerOptions extends BaseComponentOptions {
  name: string
  id: string
  namespace: string
  eventChannel: string
}

export class BaseConsumer<T extends string = string> extends BaseComponent {
  private _subscriptions: T[] = []
  protected _namespace: string
  subscribeParams?: Record<string, any> = {}

  constructor(public options: BaseConsumerOptions) {
    super(options)
    this._attachListeners(options.namespace)
  }

  get name() {
    return this.options.name
  }

  private get eventChannel() {
    return this.options.eventChannel
  }

  private setSubscription(event: T) {
    this._subscriptions = Array.from(new Set(this._subscriptions.concat(event)))
    return this._subscriptions
  }

  on(...options: Parameters<Emitter['on']>) {
    this.setSubscription(options[0] as T)
    return super.on(...options)
  }

  once(...options: Parameters<Emitter['once']>) {
    this.setSubscription(options[0] as T)
    return super.once(...options)
  }

  run() {
    return new Promise(async (resolve, reject) => {
      if (this._subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: 'signalwire.subscribe',
          params: {
            ...this.subscribeParams,
            event_channel: this.eventChannel,
            events: this._subscriptions,
          },
        }

        try {
          await this.execute(execParams)
          this._subscriptions = []
        } catch (error) {
          return reject(error)
        }
      } else {
        logger.warn('`run()` was called without any listeners attached.')
      }

      return resolve(undefined)
    })
  }
}
