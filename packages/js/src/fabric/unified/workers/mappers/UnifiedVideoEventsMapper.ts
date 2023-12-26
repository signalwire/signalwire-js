import {
  InternalVideoEventNames,
  VideoAPIEventParams,
  PubSubAction,
  MapToPubSubShape,
} from '@signalwire/core'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'

export class UnifiedVideoEventsMapper extends BaseUnifiedEventMapper {
  static ROOM_EVENTS = [
    'room.started',
    'room.subscribed',
    'room.updated',
    'room.ended',
    'room.audience_count',
    'member.joined',
    'member.left',
    'member.updated',
    'member.talking',
    'member.promoted',
    'member.demoted',
    'layout.changed',
    'recording.started',
    'recording.updated',
    'recording.ended',
    'playback.started',
    'playback.updated',
    'playback.ended',
    'stream.started',
    'stream.ended',
  ]

  static mapType(oldType: string): InternalVideoEventNames {
    return `video.${oldType.replace(
      'call.',
      'room.'
    )}` as InternalVideoEventNames
  }

  worksWith(action: PubSubAction): boolean {
    const { type = '' } = action

    return UnifiedVideoEventsMapper.ROOM_EVENTS.includes(
      type.replace('call.', 'room.')
    )
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: UnifiedVideoEventsMapper.mapType(type),
      payload,
    }
  }
}
