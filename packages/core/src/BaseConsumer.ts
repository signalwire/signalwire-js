import {
  BaseComponent,
  ExecuteParams,
  logger,
  EventEmitter,
  BaseComponentOptions,
} from '.'

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

  constructor(public options: BaseComponentOptions<EventTypes>) {
    super(options)

    /**
     * Local events can be attached right away because we
     * have enough information during build time on how to
     * namespace them. Other events depend on info coming
     * from the server and for those we have to wait until
     * the `subscribe()` happen.
     */
    this.applyEmitterTransforms({ local: true })
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
          this.applyEmitterTransforms()
          this.attachCustomSagas()
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
