import { RoomSession, UNSAFE_PROP_ACCESS } from './RoomSession'

describe('RoomSession Object', () => {
  it('should control which properties the user can access before connecting the room.', async () => {
    const roomSession = new RoomSession({
      token: '<some-token>',
    })

    expect(() => roomSession.active).not.toThrow()
    expect(() => roomSession.memberId).not.toThrow()
    expect(() => roomSession.join()).not.toThrow()
    UNSAFE_PROP_ACCESS.map((prop) => {
      // @ts-expect-error
      expect(() => roomSession[prop]).toThrow()
    })

    // @ts-expect-error
    roomSession.state = 'active'

    expect(() => roomSession.active).not.toThrow()
    expect(() => roomSession.memberId).not.toThrow()
    expect(() => roomSession.join()).not.toThrow()
    UNSAFE_PROP_ACCESS.map((prop) => {
      // @ts-expect-error
      expect(() => roomSession[prop]).not.toThrow()
    })
  })
})
