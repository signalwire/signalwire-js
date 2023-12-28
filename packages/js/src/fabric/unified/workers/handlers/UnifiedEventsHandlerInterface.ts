import { PubSubAction } from '@signalwire/core'

export interface UnifiedEventsHandlerInterface {
  filter: (action: PubSubAction) => boolean
  handle: (action: PubSubAction) => void
}
