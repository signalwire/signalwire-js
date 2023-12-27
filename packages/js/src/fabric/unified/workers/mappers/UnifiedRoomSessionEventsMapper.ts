import {
  InternalVideoEventNames,
  VideoAPIEventParams,
  PubSubAction,
  MapToPubSubShape,
} from '@signalwire/core'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'

export class UnifiedRoomSessionEventsMapper extends BaseUnifiedEventMapper {
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
  ]

  static mapType(oldType: string): InternalVideoEventNames {
    return `video.${oldType.replace(
      'call.',
      'room.'
    )}` as InternalVideoEventNames
  }

  worksWith(action: PubSubAction): boolean {
    const { type = '' } = action

    return UnifiedRoomSessionEventsMapper.ROOM_EVENTS.includes(
      type.replace('call.', 'room.')
    )
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: UnifiedRoomSessionEventsMapper.mapType(type),
      payload,
    }
  }
}
