import type {
  AssertSameType,
  MessageReceivedEventName,
  MessageUpdatedEventName,
} from '@signalwire/core'
import type { MessageContract } from '../messaging/Message'
import { MessagingClientApiEventsDocs } from './messaging.docs'

export type RealTimeMessagingApiEventsHandlerMapping = Record<
  MessageReceivedEventName | MessageUpdatedEventName,
  (message: MessageContract) => void
>

type MessagingClientApiEventsMain = {
  [k in keyof RealTimeMessagingApiEventsHandlerMapping]: RealTimeMessagingApiEventsHandlerMapping[k]
}

export interface MessagingClientApiEvents extends AssertSameType<
  MessagingClientApiEventsMain,
  MessagingClientApiEventsDocs
> {}