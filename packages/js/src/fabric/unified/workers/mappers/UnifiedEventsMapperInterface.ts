import { PubSubAction } from '@signalwire/core'

export interface UnifiedEventsMapperInterface {
  filter: (action: PubSubAction) => boolean
  mapAction: (action: PubSubAction) => PubSubAction[]
}
