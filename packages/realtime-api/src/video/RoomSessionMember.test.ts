import { configureJestStore } from '../testUtils'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from './RoomSessionMember'

describe('Member Object', () => {
  let member: RoomSessionMember

  beforeEach(() => {
    member = createRoomSessionMemberObject({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    member.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    // TS complains due to defineProperties
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
  })
})
