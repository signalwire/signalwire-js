import { GlobalMessageEvents, MessageState } from '@signalwire/core'
import { Message } from '../message/Message'

export type MessageEventHandler = (message: Message) => void

export type RelayMessageAPIEventHandlerMappings = Record<
  GlobalMessageEvents,
  MessageEventHandler
>

export type RelayMessageAPIEvents = {
  [K in keyof RelayMessageAPIEventHandlerMappings]: RelayMessageAPIEventHandlerMappings[K]
}

export type MessageComponentEventHanlderMappings = Record<
  Extract<GlobalMessageEvents, MessageState>,
  MessageEventHandler
>

export type MessageComponentEvents = {
  [K in keyof MessageComponentEventHanlderMappings]: MessageComponentEventHanlderMappings[K]
}
