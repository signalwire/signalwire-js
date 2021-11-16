import { BaseComponent, EventEmitter } from '..'

export interface ChatInterface<EventTypes extends EventEmitter.ValidEventTypes>
  extends BaseComponent<EventTypes> {}

export * from './methods'
