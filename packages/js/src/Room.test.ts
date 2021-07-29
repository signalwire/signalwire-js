import { Room } from './Room'
import { configureJestStore } from './testUtils'

describe('Room Object', () => {
  let room: Room

  beforeEach(() => {
    room = new Room({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    room.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(room.audioMute).toBeDefined()
    expect(room.audioUnmute).toBeDefined()
    expect(room.videoMute).toBeDefined()
    expect(room.videoUnmute).toBeDefined()
    expect(room.deaf).toBeDefined()
    expect(room.undeaf).toBeDefined()
    expect(room.setMicrophoneVolume).toBeDefined()
    expect(room.setSpeakerVolume).toBeDefined()
    expect(room.setInputSensitivity).toBeDefined()
    expect(room.removeMember).toBeDefined()
    expect(room.getMembers).toBeDefined()
    expect(room.getLayouts).toBeDefined()
    expect(room.setLayout).toBeDefined()
    expect(room.hideVideoMuted).toBeDefined()
    expect(room.showVideoMuted).toBeDefined()
  })
})
