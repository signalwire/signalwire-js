import { toInternalEventName } from './toInternalEventName'

describe('toInternalEventName', () => {
  it('should transform public events into internal without namespace', () => {
    const events = [
      // no-op
      ['video.room.started', 'video.room.started'],
      ['video.member.updated', 'video.member.updated'],
      ['video.member.updated.video_muted', 'video.member.updated.video_muted'],
      ['video.other_snake_case', 'video.other_snake_case'],
      // camel to snake
      ['video.member.updated.videoMuted', 'video.member.updated.video_muted'],
      ['video.member.otherSnakeCase', 'video.member.other_snake_case'],
      ['video.recording.exampleHere', 'video.recording.example_here'],
    ]
    const namespace = 'random-uuid'

    events.forEach(([input, output]) => {
      expect(toInternalEventName({ event: input })).toEqual(output)
      // @ts-ignore
      expect(toInternalEventName({ event: input, namespace: null })).toEqual(
        output
      )
      expect(toInternalEventName({ event: input, namespace: '' })).toEqual(
        output
      )
      expect(toInternalEventName({ event: input, namespace })).toEqual(
        `${namespace}:${output}`
      )
    })
  })
})
