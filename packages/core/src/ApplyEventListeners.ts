import { BaseConsumer, EventEmitter } from '@signalwire/core'

/**
 * Override all old listeners with new listeners that uses BaseComponent's new even emitter
 */
export class ApplyEventListeners<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseConsumer<EventTypes> {
  protected extendEventName(event: EventEmitter.EventNames<EventTypes>) {
    return event
  }

  override on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    return super._on(this.extendEventName(event), fn)
  }

  override once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    return super._once(this.extendEventName(event), fn)
  }

  override off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    // @ts-expect-error
    return super._off(this.extendEventName(event), fn)
  }
}
