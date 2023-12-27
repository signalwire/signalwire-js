import {
  InternalVideoEventNames,
  VideoAPIEventParams,
  PubSubAction,
  MapToPubSubShape,
} from '@signalwire/core'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'

export class UnifiedPlaybackRecordingEventsMapper extends BaseUnifiedEventMapper {
  static ROOM_EVENTS = [
    'recording.started',
    'recording.updated',
    'recording.ended',
    'playback.started',
    'playback.updated',
    'playback.ended'
  ]

  static mapType(oldType: string): InternalVideoEventNames {
    return `video.${oldType.replace(
      'call.',
      ''
    )}` as InternalVideoEventNames
  }

  worksWith(action: PubSubAction): boolean {
    const { type = '' } = action

    return UnifiedPlaybackRecordingEventsMapper.ROOM_EVENTS.includes(
      type.replace('call.', '')
    )
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: UnifiedPlaybackRecordingEventsMapper.mapType(type),
      payload,
    }
  }
}
