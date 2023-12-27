import { UnifiedCallStateEventsMapper } from './UnifiedCallStateEventsMapper'

describe('UnifiedStreamEventsMapper', () => {
  const mapper = new UnifiedCallStateEventsMapper({})

  it('should maps call.state to video.call.state', () => {
    const action = {
      type: 'call.state',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.call.state',
      payload: {},
    })
  })
  it('should maps call.state.created to video.call.state.created', () => {
    const action = {
      type: 'call.state.created',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.call.state.created',
      payload: {},
    })
  })
})
