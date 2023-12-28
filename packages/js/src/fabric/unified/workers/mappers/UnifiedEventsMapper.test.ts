import { UnifiedEventsMapper } from './UnifiedEventsMapper'

describe('UnifiedStreamEventsMapper', () => {
  const mapper = new UnifiedEventsMapper()

  it('should maps call.connect', () => {
    const action = {
      type: 'call.connect',
      payload: {
        connect_state: 'connected',
      },
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    const mapped = mapper.mapAction(action)

    expect(mapped).toEqual([
      {
        type: 'call.connect.connected',
        payload: {
          connect_state: 'connected',
        },
      },
      {
        type: 'video.room.subscribed',
        payload: {
          connect_state: 'connected',
        },
      },
    ])
  })

  it('should maps call.state', () => {
    const action = {
      type: 'call.state',
      payload: {
        call_state: 'started',
      },
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    const mapped = mapper.mapAction(action)

    expect(mapped).toEqual([
      {
        type: 'call.state.started',
        payload: {
          call_state: 'started',
        },
      },
      {
        type: 'video.room.started',
        payload: {
          call_state: 'started',
        },
      },
    ])
  })

  it('should not maps call.state.created', () => {
    const action = {
      type: 'call.state.created',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeFalsy()
  })

  it('should not maps call.recording.started', () => {
    const action = {
      type: 'call.recording.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeFalsy()
  })

  it('should not maps call.recording.updated', () => {
    const action = {
      type: 'call.recording.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeFalsy()
  })

  it('should not maps call.recording.ended', () => {
    const action = {
      type: 'call.recording.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeFalsy()
  })

  it('should maps call.playback', () => {
    const action = {
      type: 'call.playback',
      payload: {
        playback_state: 'started',
      },
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.playback.started',
        payload: {
          playback_state: 'started',
        },
      },
    ])
  })
  it('should not maps video.room.playback.started', () => {
    const action = {
      type: 'video.room.playback.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeFalsy()
  })

  it('should maps call.started to video.room.started', () => {
    const action = {
      type: 'call.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.started',
        payload: {},
      },
    ])
  })

  it('should maps call.subscribed to video.room.subscribed', () => {
    const action = {
      type: 'call.subscribed',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.subscribed',
        payload: {},
      },
    ])
  })

  it('should maps call.updated to video.room.updated', () => {
    const action = {
      type: 'call.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.updated',
        payload: {},
      },
    ])
  })

  it('should maps call.ended to video.room.ended', () => {
    const action = {
      type: 'call.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.ended',
        payload: {},
      },
    ])
  })

  it('should maps call.audience_count to video.room.audience_count', () => {
    const action = {
      type: 'call.audience_count',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.room.audience_count',
        payload: {},
      },
    ])
  })
  it('should maps member.joined to video.member.joined', () => {
    const action = {
      type: 'member.joined',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.joined',
        payload: {},
      },
    ])
  })

  it('should maps member.left to video.member.left', () => {
    const action = {
      type: 'member.left',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.left',
        payload: {},
      },
    ])
  })

  it('should maps member.updated to video.member.updated', () => {
    const action = {
      type: 'member.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.updated',
        payload: {},
      },
    ])
  })

  it('should maps member.talking to video.member.talking', () => {
    const action = {
      type: 'member.talking',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.talking',
        payload: {},
      },
    ])
  })

  it('should maps member.promoted to video.member.promoted', () => {
    const action = {
      type: 'member.promoted',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.promoted',
        payload: {},
      },
    ])
  })

  it('should maps member.demoted to video.member.demoted', () => {
    const action = {
      type: 'member.demoted',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.member.demoted',
        payload: {},
      },
    ])
  })

  it('should maps layout.changed to video.layout.changed', () => {
    const action = {
      type: 'layout.changed',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.layout.changed',
        payload: {},
      },
    ])
  })

  it('should maps call.outbound_stream.started to video.stream.started', () => {
    const action = {
      type: 'call.outbound_stream.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.stream.started',
        payload: {},
      },
    ])
  })

  it('should maps call.outbound_stream.ended to video.stream.ended', () => {
    const action = {
      type: 'call.outbound_stream.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.filter(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.mapAction(action)).toEqual([
      {
        type: 'video.stream.ended',
        payload: {},
      },
    ])
  })
})
