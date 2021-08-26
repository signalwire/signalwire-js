import {
  BaseComponent,
  BaseComponentOptions,
  ExecuteParams,
  logger,
} from '@signalwire/core'

interface BaseConsumerOptions extends BaseComponentOptions {
  name: string
  id: string
  namespace: string
  eventChannel: string
}

export class BaseConsumer extends BaseComponent {
  protected _namespace: string
  protected subscribeParams?: Record<string, any> = {}

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

  protected getSubscriptions(): (string | symbol)[] {
    return this.eventNames()
  }

  run() {
    return new Promise(async (resolve, reject) => {
      const subscriptions = this.getSubscriptions()
      if (subscriptions.length > 0) {
        this.applyEmitterTransforms()

        const execParams: ExecuteParams = {
          method: 'signalwire.subscribe',
          params: {
            ...this.subscribeParams,
            event_channel: this.eventChannel,
            events: subscriptions,
          },
        }

        try {
          await this.execute(execParams)
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
