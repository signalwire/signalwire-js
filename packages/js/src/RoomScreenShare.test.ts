import { RoomScreenShareAPI } from './RoomScreenShare'
import { configureJestStore } from './testUtils'

describe('RoomScreenShare Object', () => {
  let roomScreenShare: any

  beforeEach(() => {
    roomScreenShare = new RoomScreenShareAPI({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    roomScreenShare.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(roomScreenShare.audioMute).toBeDefined()
    expect(roomScreenShare.audioUnmute).toBeDefined()
    expect(roomScreenShare.videoMute).toBeDefined()
    expect(roomScreenShare.videoUnmute).toBeDefined()
    expect(roomScreenShare.setMicrophoneVolume).toBeDefined()
    expect(roomScreenShare.setInputSensitivity).toBeDefined()
  })
})
