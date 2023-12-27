import {
  InternalVideoEventNames,
  VideoAPIEventParams,
  PubSubAction,
  MapToPubSubShape,
  InternalVideoStreamEventNames,
} from '@signalwire/core'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'
import { UnifiedStreamEventNames } from 'packages/core/src/types/unified'

export class UnifiedStreamEventsMapper extends BaseUnifiedEventMapper {
  static STREAM_EVENTS: Record<
    UnifiedStreamEventNames,
    InternalVideoStreamEventNames
  > = {
    'call.outbound_stream.started': 'video.stream.started',
    'call.outbound_stream.ended': 'video.stream.ended',
  }

  static mapType(
    oldType: 'call.outbound_stream.started' | 'call.outbound_stream.ended'
  ): InternalVideoEventNames {
    return UnifiedStreamEventsMapper.STREAM_EVENTS[oldType]
  }

  worksWith(action: PubSubAction): boolean {
    const { type } = action

    return Object.keys(UnifiedStreamEventsMapper.STREAM_EVENTS).includes(type)
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: UnifiedStreamEventsMapper.mapType(type),
      payload,
    }
  }
}
