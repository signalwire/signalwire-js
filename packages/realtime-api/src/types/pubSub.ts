import type {
  PubSubMessage,
  PubSubMessageEventName,
  PubSubNamespace,
} from '@signalwire/core'

export type RealTimePubSubApiEventsHandlerMapping = Record<
  `${PubSubNamespace}.${PubSubMessageEventName}`,
  (message: PubSubMessage) => void
>

export type RealTimePubSubEvents = {
  [k in keyof RealTimePubSubApiEventsHandlerMapping]: RealTimePubSubApiEventsHandlerMapping[k]
}
