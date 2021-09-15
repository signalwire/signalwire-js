import {
  BaseComponent,
  ExecuteParams,
  logger,
  validateEventsToSubscribe,
  EventEmitter,
  BaseComponentOptions,
} from '@signalwire/core'

/**
 * Instances of this class are meant to be wrapped by a
 * Proxy that intercepts the `_eventsNamespace` (to tell the
 * BaseComponent it's fine to attach the event listeners)
 * and the `eventChannel`
 * @internal
 */
export class BaseConsumer<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  protected subscribeParams?: Record<string, any> = {}

  protected getSubscriptions(): (string | symbol)[] {
    return validateEventsToSubscribe(this.eventNames())
  }

  constructor(public options: BaseComponentOptions<EventTypes>) {
    super(options)

    this.applyEmitterTransforms()
  }

  subscribe() {
    return new Promise(async (resolve, reject) => {
      const subscriptions = this.getSubscriptions()
      if (subscriptions.length > 0) {
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
