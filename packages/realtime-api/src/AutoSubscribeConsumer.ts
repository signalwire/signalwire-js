import {
  BaseComponentOptions,
  BaseConsumer,
  EventEmitter,
  debounce,
  validateEventsToSubscribe,
} from '@signalwire/core'

export class AutoSubscribeConsumer<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseConsumer<EventTypes> {
  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: BaseComponentOptions) {
    super(options)

    this.debouncedSubscribe = debounce(this.subscribe, 100)
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<EventTypes>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }

  override on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    const instance = super.on(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  override once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    const instance = super.once(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  override off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    const instance = super.off(event, fn)
    return instance
  }
}
