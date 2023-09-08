import type { PubSubMessage, PubSubMessageEventName } from '@signalwire/core'

export type RealTimePubSubApiEventsHandlerMapping = Record<
  PubSubMessageEventName,
  (message: PubSubMessage) => void
>

export type RealTimePubSubEvents = {
  [k in keyof RealTimePubSubApiEventsHandlerMapping]: RealTimePubSubApiEventsHandlerMapping[k]
}
