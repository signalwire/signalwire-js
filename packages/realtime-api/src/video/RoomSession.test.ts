import { configureJestStore } from '../testUtils'
import { createRoomSessionObject, RoomSessionAPI } from './RoomSession'

describe('RoomSession Object', () => {
  let roomSession: RoomSessionAPI

  beforeEach(() => {
    roomSession = createRoomSessionObject({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    roomSession.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    // TS complains due to defineProperties
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
    expect(roomSession.hideVideoMuted).toBeDefined()
    expect(roomSession.showVideoMuted).toBeDefined()
    expect(roomSession.getLayouts).toBeDefined()
    expect(roomSession.setLayout).toBeDefined()
  })
})
