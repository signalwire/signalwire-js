import type {
  MessageReceivedEventName,
  MessageUpdatedEventName,
} from '@signalwire/core'
import type { MessageContract } from '../messaging/Message'

export type RealTimeMessagingApiEventsHandlerMapping = Record<
  MessageReceivedEventName | MessageUpdatedEventName,
  (message: MessageContract) => void
>

export type RealTimeMessagingApiEvents = {
  [k in keyof RealTimeMessagingApiEventsHandlerMapping]: RealTimeMessagingApiEventsHandlerMapping[k]
}
