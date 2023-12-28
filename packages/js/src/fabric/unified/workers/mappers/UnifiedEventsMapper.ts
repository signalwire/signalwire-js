import { PubSubAction } from '@signalwire/core'
import { UnifiedEventsMapperInterface } from './UnifiedEventsMapperInterface'

export class UnifiedEventsMapper implements UnifiedEventsMapperInterface {
  static MAPPINGS: Record<string, string[]> = {
    'call.state': [
      'call.state.{call_state}',
      'video.room.{call_state}',
      'video.room.{call_state(created:started)}',
    ],
    'call.play': ['call.play.{state}'],
    'call.collect': ['call.collect.{collect_state}'],
    'call.connect': [
      'call.connect.{connect_state}',
      'video.room.{connect_state(connected:subscribed)}',
    ],
    'call.audience_count': ['video.room.audience_count'],
    'call.denoise': ['call.denoise'],
    'call.detect': ['call.detect.{detect_state}'],
    'call.dial': ['call.dial.{dial_state}'],
    'call.send_digits': ['call.send_digits', 'video.room.send_digits'], //TODO double check
    'call.refer': ['calling.call.refer'],
    'call.received': ['call.received'],
    'call.fax': ['call.fax.{fax_state}'],
    'call.hold': ['call.hold.{fax_state}'],
    'call.prompt': ['call.prompt.{prompt_state}'],
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
    'call.recording': ['video.room.recording.{recording_state}'],
    'call.playback': ['video.room.playback.{playback_state}'],
    'call.outbound_stream.started': ['video.stream.started'],
    'call.outbound_stream.ended': ['video.stream.ended'],
  }

  private static _eval(template: string, action: PubSubAction): PubSubAction {
    // test is a template ex: call.state.{call_state}
    const matches =
      /(?<prefix>\S*)\{(?<stateKey>[^\(\)]*)(?<replace>\((?<from>\S*):(?<to>\S*)\))?\}$/.exec(
        template
      )

    if (matches?.groups && !!action.payload) {
      // is a template
      const { prefix, stateKey, replace, from, to } = matches.groups
      const newType =
        //@ts-expect-error this can produce invalid types but those will just been ignored on the swEventChannel
        !!replace && action.payload[stateKey] === from
          ? `${prefix}${to}`
          : //@ts-ignore
            `${prefix}${action.payload[stateKey]}`

      return {
        ...action,
        //@ts-ignore same issue with the type
        type: newType,
      }
    }

    return {
      ...action,
      //@ts-expect-error same here
      type: template,
    }
  }

  mapAction(action: PubSubAction): PubSubAction[] {
    const { type } = action

    const toMap = UnifiedEventsMapper.MAPPINGS[type]

    const allNewActions = toMap.map((eventTemplate) =>
      UnifiedEventsMapper._eval(eventTemplate, action)
    )

    return allNewActions
  }

  filter(action: PubSubAction): boolean {
    const { type } = action

    return Object.keys(UnifiedEventsMapper.MAPPINGS).includes(type)
  }
}
