import { BaseConsumer, EventEmitter } from '@signalwire/core'

/**
 * This class is extended by Call and Voice since they use
 * `_on`, `_once`, and `_off` instead of
 * `on`, `once`, and `off`
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
