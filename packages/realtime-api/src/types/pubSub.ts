import type { PubSubMessage, PubSubMessageEventName } from '@signalwire/core'

export type RealTimePubSubApiEventsHandlerMapping = Record<
  PubSubMessageEventName,
  (message: PubSubMessage) => void
>
