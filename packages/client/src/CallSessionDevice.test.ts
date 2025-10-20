import { CallSessionDeviceAPI } from './CallSessionDevice'
import type { CallSessionDevice } from './CallSessionDevice'
import { configureJestStore } from './testUtils'

describe('CallDevice Object', () => {
  let callDevice: CallSessionDevice

  beforeEach(() => {
    callDevice = new CallSessionDeviceAPI({
      store: configureJestStore(),
    }) as any as CallSessionDevice
    // @ts-expect-error
    callDevice.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(callDevice.audioMute).toBeDefined()
    expect(callDevice.audioUnmute).toBeDefined()
    expect(callDevice.videoMute).toBeDefined()
    expect(callDevice.videoUnmute).toBeDefined()
    expect(callDevice.setMicrophoneVolume).toBeDefined()
    expect(callDevice.setInputVolume).toBeDefined()
    expect(callDevice.setInputSensitivity).toBeDefined()
  })
})
