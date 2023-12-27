import { UnifiedRoomSessionEventsMapper } from './UnifiedRoomSessionEventsMapper'

describe('UnifiedRoomSessionEventsMapper', () => {
  const mapper = new UnifiedRoomSessionEventsMapper({})

  it('should maps call.started to video.room.started', () => {
    const action = {
      type: 'call.started',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.room.started',
      payload: {},
    })
  })
  it('should maps call.subscribed to video.room.subscribed', () => {
    const action = {
      type: 'call.subscribed',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.room.subscribed',
      payload: {},
    })
  })
  it('should maps call.updated to video.room.updated', () => {
    const action = {
      type: 'call.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.room.updated',
      payload: {},
    })
  })
  it('should maps call.ended to video.room.ended', () => {
    const action = {
      type: 'call.ended',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.room.ended',
      payload: {},
    })
  })
  it('should maps call.audience_count to video.room.audience_count', () => {
    const action = {
      type: 'call.audience_count',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.room.audience_count',
      payload: {},
    })
  })
  it('should maps member.joined to video.member.joined', () => {
    const action = {
      type: 'member.joined',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.joined',
      payload: {},
    })
  })
  it('should maps member.left to video.member.left', () => {
    const action = {
      type: 'member.left',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.left',
      payload: {},
    })
  })
  it('should maps member.updated to video.member.updated', () => {
    const action = {
      type: 'member.updated',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.updated',
      payload: {},
    })
  })
  it('should maps member.talking to video.member.talking', () => {
    const action = {
      type: 'member.talking',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.talking',
      payload: {},
    })
  })
  it('should maps member.promoted to video.member.promoted', () => {
    const action = {
      type: 'member.promoted',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.promoted',
      payload: {},
    })
  })
  it('should maps member.demoted to video.member.demoted', () => {
    const action = {
      type: 'member.demoted',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.member.demoted',
      payload: {},
    })
  })
  it('should maps layout.changed to video.layout.changed', () => {
    const action = {
      type: 'layout.changed',
      payload: {},
    }

    //@ts-ignore
    expect(mapper.worksWith(action)).toBeTruthy()

    //@ts-ignore
    expect(mapper.map(action)).toEqual({
      type: 'video.layout.changed',
      payload: {},
    })
  })
})
