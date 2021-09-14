import { configureJestStore } from '../testUtils'
import { createRoomSessionObject } from './RoomSession'

describe('RoomSession Object', () => {
  let roomSession: ReturnType<typeof createRoomSessionObject>

  beforeEach(() => {
    roomSession = createRoomSessionObject({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    roomSession.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(roomSession.videoMute).toBeDefined()
    expect(roomSession.videoUnmute).toBeDefined()
    expect(roomSession.getMembers).toBeDefined()
    expect(roomSession.audioMute).toBeDefined()
    expect(roomSession.audioUnmute).toBeDefined()
    expect(roomSession.deaf).toBeDefined()
    expect(roomSession.undeaf).toBeDefined()
    expect(roomSession.setMicrophoneVolume).toBeDefined()
    expect(roomSession.setSpeakerVolume).toBeDefined()
    expect(roomSession.setInputSensitivity).toBeDefined()
    expect(roomSession.removeMember).toBeDefined()
    expect(roomSession.setHideVideoMuted).toBeDefined()
    expect(roomSession.getLayouts).toBeDefined()
    expect(roomSession.setLayout).toBeDefined()
  })
})
