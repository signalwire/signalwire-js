import { Member } from './Member'

describe('Member Object', () => {
  let member: Member

  beforeEach(() => {
    member = new Member({
      store: jest.fn() as any,
      emitter: jest.fn() as any,
      params: {
        room_id: 'room_id',
        room_session_id: 'room_session_id',
        member: {} as any,
      },
    })
    member.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(member.audioMute).toBeDefined()
    expect(member.audioUnmute).toBeDefined()
    expect(member.videoMute).toBeDefined()
    expect(member.videoUnmute).toBeDefined()
    expect(member.deaf).toBeDefined()
    expect(member.undeaf).toBeDefined()
    expect(member.setMicrophoneVolume).toBeDefined()
    expect(member.setSpeakerVolume).toBeDefined()
    expect(member.setInputSensitivity).toBeDefined()
    expect(member.remove).toBeDefined()
    expect(member.removeMember).toBeDefined()
  })
})
