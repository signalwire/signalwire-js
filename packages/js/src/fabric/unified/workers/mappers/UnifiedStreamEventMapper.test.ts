import { UnifiedStreamEventsMapper } from './UnifiedStreamEventsMapper'

describe('UnifiedStreamEventsMapper', () => {
  const mapper = new UnifiedStreamEventsMapper({})

  it('should maps call.outbound_stream.started to video.stream.started', () => {
    const action = {
      type: 'call.outbound_stream.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.stream.started',
      payload: {},
    })
  })
  it('should maps call.outbound_stream.ended to video.stream.ended', () => {
    const action = {
      type: 'call.outbound_stream.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.stream.ended',
      payload: {},
    })
  })
})
