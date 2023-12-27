import { UnifiedPlaybackRecordingEventsMapper } from './UnifiedPlaybackRecordingEventsMapper'

describe('UnifiedPlaybackRecordingEventsMapper', () => {
  const mapper = new UnifiedPlaybackRecordingEventsMapper({})

  it('should maps call.recording.started to video.recording.started', () => {
    const action = {
      type: 'call.recording.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.recording.started',
      payload: {},
    })
  })
  it('should maps call.recording.updated to video.recording.updated', () => {
    const action = {
      type: 'call.recording.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.recording.updated',
      payload: {},
    })
  })
  it('should maps call.recording.ended to video.recording.ended', () => {
    const action = {
      type: 'call.recording.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.recording.ended',
      payload: {},
    })
  })
  it('should maps call.playback.started to video.playback.started', () => {
    const action = {
      type: 'call.playback.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.playback.started',
      payload: {},
    })
  })
  it('should maps call.playback.updated to video.playback.updated', () => {
    const action = {
      type: 'call.playback.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.playback.updated',
      payload: {},
    })
  })
  it('should maps call.playback.ended to video.playback.ended', () => {
    const action = {
      type: 'call.playback.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.playback.ended',
      payload: {},
    })
  })
})
