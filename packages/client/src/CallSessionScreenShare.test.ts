import { CallSessionScreenShareAPI } from './CallSessionScreenShare'
import type { CallSessionScreenShare } from './CallSessionScreenShare'
import { configureJestStore } from './testUtils'

describe('RoomScreenShare Object', () => {
  let roomScreenShare: CallSessionScreenShare

  beforeEach(() => {
    roomScreenShare = new CallSessionScreenShareAPI({
      store: configureJestStore(),
    }) as any as CallSessionScreenShare
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
