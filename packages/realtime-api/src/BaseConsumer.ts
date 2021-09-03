import {
  BaseComponent,
  BaseComponentOptions,
  ExecuteParams,
  logger,
  validateEventsToSubscribe,
} from '@signalwire/core'

interface BaseConsumerOptions extends BaseComponentOptions {
  namespace?: string
}

export class BaseConsumer extends BaseComponent {
  protected subscribeParams?: Record<string, any> = {}

  constructor(public options: BaseConsumerOptions) {
    super(options)
    this._attachListeners(options.namespace)
  }

  protected getSubscriptions(): (string | symbol)[] {
    return validateEventsToSubscribe(this.eventNames())
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
            event_channel: this.getStateProperty('eventChannel'),
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
