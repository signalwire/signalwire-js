import { RoomScreenShareAPI } from './RoomScreenShare'
import type { RoomScreenShare } from './RoomScreenShare'
import { configureJestStore } from './testUtils'

describe('RoomScreenShare Object', () => {
  let roomScreenShare: RoomScreenShare

  beforeEach(() => {
    roomScreenShare = new RoomScreenShareAPI({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    }) as any as RoomScreenShare
    // @ts-expect-error
    roomScreenShare.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(roomScreenShare.audioMute).toBeDefined()
    expect(roomScreenShare.audioUnmute).toBeDefined()
    expect(roomScreenShare.videoMute).toBeDefined()
    expect(roomScreenShare.videoUnmute).toBeDefined()
    expect(roomScreenShare.setMicrophoneVolume).toBeDefined()
    expect(roomScreenShare.setInputVolume).toBeDefined()
    expect(roomScreenShare.setInputSensitivity).toBeDefined()
  })
})
