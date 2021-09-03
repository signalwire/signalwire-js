import { toInternalEventName } from './toInternalEventName'

describe('toInternalEventName', () => {
  it('should transform public events into internal', () => {
    expect(toInternalEventName('video.room.started')).toEqual(
      'video.room.started'
    )
    expect(toInternalEventName('video.member.updated')).toEqual(
      'video.member.updated'
    )
    expect(toInternalEventName('video.member.updated.video_muted')).toEqual(
      'video.member.updated.video_muted'
    )
    expect(
      toInternalEventName('video.member.updated.other_snake_case')
    ).toEqual('video.member.updated.other_snake_case')

    expect(toInternalEventName('video.member.updated.videoMuted')).toEqual(
      'video.member.updated.video_muted'
    )
    expect(toInternalEventName('video.member.updated.otherSnakeCase')).toEqual(
      'video.member.updated.other_snake_case'
    )

    expect(toInternalEventName('video.recording.started')).toEqual(
      'video.recording.started'
    )
    expect(toInternalEventName('video.recording.exampleHere')).toEqual(
      'video.recording.example_here'
    )
  })
})
