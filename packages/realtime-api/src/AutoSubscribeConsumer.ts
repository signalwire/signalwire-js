import {
  BaseComponentOptions,
  BaseConsumer,
  EventEmitter,
  debounce,
} from '@signalwire/core'

export class AutoSubscribeConsumer<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseConsumer<EventTypes> {
  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: BaseComponentOptions<EventTypes>) {
    super(options)

    this.debouncedSubscribe = debounce(this.subscribe, 100)
  }

  override on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    const instance = super._on(`video.${event}`, fn)
    this.debouncedSubscribe()
    return instance
  }

  override once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    const instance = super._once(`video.${event}`, fn)
    this.debouncedSubscribe()
    return instance
  }

  override off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    const instance = super._off(`video.${event}`, fn)
    return instance
  }
}
