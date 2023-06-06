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

  override on(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._on(this.extendEventName(event), fn)
  }

  override once(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._once(this.extendEventName(event), fn)
  }

  override off(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._off(this.extendEventName(event), fn)
  }
}
