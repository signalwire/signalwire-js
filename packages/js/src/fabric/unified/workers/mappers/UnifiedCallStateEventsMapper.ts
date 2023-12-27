import {
  InternalVideoEventNames,
  VideoAPIEventParams,
  PubSubAction,
  MapToPubSubShape,
} from '@signalwire/core'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'

export class UnifiedCallStateEventsMapper extends BaseUnifiedEventMapper {
  static ROOM_EVENTS = ['call.state', 'call.state.created']

  static mapType(oldType: string): InternalVideoEventNames {
    return `video.${oldType}` as InternalVideoEventNames
  }

  worksWith(action: PubSubAction): boolean {
    const { type = '' } = action

    return UnifiedCallStateEventsMapper.ROOM_EVENTS.includes(type)
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: UnifiedCallStateEventsMapper.mapType(type),
      payload,
    }
  }
}
