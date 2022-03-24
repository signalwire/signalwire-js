import type { MessageContract } from '../messaging/Message'

// FIXME: change event name ?
export type RealTimeMessagingApiEventsHandlerMapping = Record<
  'messaging.state',
  (message: MessageContract) => void
> &
  Record<'messaging.receive', (message: MessageContract) => void>

export type RealTimeMessagingApiEvents = {
  [k in keyof RealTimeMessagingApiEventsHandlerMapping]: RealTimeMessagingApiEventsHandlerMapping[k]
}
