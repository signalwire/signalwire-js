import { PubSubAction } from '@signalwire/core'
import {
  MappableObject,
  mapObject,
} from 'packages/core/src/utils/mapObject'

const EVENT_MAPPINGS: Record<string, string[]> = {
  'call.state': [
    'call.state.[call_state]',
    'video.room.[call_state]',
    'video.room.[call_state(created:started)]',
  ],
  'call.play': ['call.play.[state]'],
  'call.collect': ['call.collect.[collect_state]'],
  'call.connect': [
    'call.connect.[connect_state]',
    'video.room.[connect_state(connected:subscribed)]',
  ],
  'call.join': ['video.room.subscribed{"callID":"room_id"}'],
  'call.audience_count': ['video.room.audience_count'],
  'call.denoise': ['call.denoise'],
  'call.detect': ['call.detect.[detect_state]'],
  'call.dial': ['call.dial.[dial_state]'],
  'call.send_digits': ['call.send_digits', 'video.room.send_digits'], //TODO double check
  'call.refer': ['calling.call.refer'],
  'call.received': ['call.received'],
  'call.fax': ['call.fax.[fax_state]'],
  'call.hold': ['call.hold.[fax_state]'],
  'call.prompt': ['call.prompt.[prompt_state]'],
  'call.started': ['video.room.started'],
  'call.subscribed': ['video.room.subscribed'],
  'call.updated': ['video.room.updated'],
  'call.ended': ['video.room.ended'],
  'member.joined': ['video.member.joined'],
  'member.left': ['video.member.left'],
  'member.updated': ['video.member.updated'],
  'member.talking': ['video.member.talking'],
  'member.promoted': ['video.member.promoted'],
  'member.demoted': ['video.member.demoted'],
  'layout.changed': ['video.layout.changed'],
  'call.recording': ['video.room.recording.[recording_state]'],
  'call.playback': ['video.room.playback.[playback_state]'],
  'call.outbound_stream.started': ['video.stream.started'],
  'call.outbound_stream.ended': ['video.stream.ended'],
}

export function fromUnifiedEvent(action: MappableObject): PubSubAction[] {
  const { type } = action

  if (!Object.keys(EVENT_MAPPINGS).includes(type)) {
    return []
  }

  const mapDefinitions = EVENT_MAPPINGS[type]
  const allNewActions = mapDefinitions.map((eventTemplate) =>
    mapObject(eventTemplate, action)
  )

  //@ts-expect-error
  return allNewActions.filter((obj?) => !!obj)
}
