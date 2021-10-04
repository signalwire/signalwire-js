import { RoomSessionDeviceAPI } from './RoomSessionDevice'
import type { RoomSessionDevice } from './RoomSessionDevice'
import { configureJestStore } from './testUtils'

describe('RoomDevice Object', () => {
  let roomDevice: RoomSessionDevice

  beforeEach(() => {
    roomDevice = new RoomSessionDeviceAPI({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    }) as any as RoomSessionDevice
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
