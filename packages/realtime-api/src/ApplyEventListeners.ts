import { BaseConsumer, EventEmitter } from '@signalwire/core'

/**
 * Override all old listeners with new listeners that uses BaseComponent's new even emitter
 */
export class ApplyEventListeners<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseConsumer<EventTypes> {
  override on(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._on(event, fn)
  }

  override once(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._once(event, fn)
  }

  override off(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    return super._off(event, fn)
  }
}
