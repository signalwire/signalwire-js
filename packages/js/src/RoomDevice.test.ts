import { RoomDeviceAPI } from './RoomDevice'
import type { RoomDevice } from './RoomDevice'
import { configureJestStore } from './testUtils'

describe('RoomDevice Object', () => {
  let roomDevice: RoomDevice

  beforeEach(() => {
    roomDevice = new RoomDeviceAPI({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    }) as any as RoomDevice
    // @ts-expect-error
    roomDevice.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(roomDevice.audioMute).toBeDefined()
    expect(roomDevice.audioUnmute).toBeDefined()
    expect(roomDevice.videoMute).toBeDefined()
    expect(roomDevice.videoUnmute).toBeDefined()
    expect(roomDevice.setMicrophoneVolume).toBeDefined()
    expect(roomDevice.setInputVolume).toBeDefined()
    expect(roomDevice.setInputSensitivity).toBeDefined()
  })
})
