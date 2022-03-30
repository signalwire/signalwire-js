import { BaseConsumer, EventEmitter } from '@signalwire/core'

/**
 * This class is extended by Call and Voice since they don't
 * invoke "signalwire.subscribe" but they need to apply the
 * emitter transforms on each `.on()`/`.once()` call.
 * TODO: improve this logic.
 */
export class AutoApplyTransformsConsumer<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseConsumer<EventTypes> {
  override on(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    const instance = super.on(event, fn)
    this.applyEmitterTransforms()

    return instance
  }

  override once(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<EventTypes, any>
  ) {
    const instance = super.once(event, fn)
    this.applyEmitterTransforms()

    return instance
  }
}
