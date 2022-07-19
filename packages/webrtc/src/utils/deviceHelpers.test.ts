import {
  getDevices,
  getDevicesWithPermissions,
  assureDeviceId,
} from './deviceHelpers'
import { checkPermissions, stopStream } from './index'

jest.mock('./index', () => {
  return {
    ...(jest.requireActual('./index') as any),
    stopStream: jest.fn(),
  }
})

describe('Helpers browser functions', () => {
  const group1 = 'group1'
  const group2 = 'group2'
  const DEVICES_CAMERA_NO_LABELS = [
    {
      deviceId: 'uuid',
      kind: 'audioinput',
      label: 'mic1',
      groupId: group1,
    },
    {
      deviceId: 'uuid',
      kind: 'audioinput',
      label: 'mic2',
      groupId: group1,
    },
    {
      deviceId: 'uuid',
      kind: 'audioinput',
      label: 'mic3',
      groupId: group2,
    },

    {
      deviceId: 'uuid',
      kind: 'videoinput',
      label: '',
      groupId:
        '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
    },
    {
      deviceId: 'uuid',
      kind: 'videoinput',
      label: '',
      groupId: group2,
    },

    {
      deviceId: 'uuid',
      kind: 'audiooutput',
      label: 'speaker1',
      groupId: group1,
    },
    {
      deviceId: 'uuid',
      kind: 'audiooutput',
      label: 'speaker2',
      groupId: group1,
    },
  ]

  const DEVICES_MICROPHONE_NO_LABELS = [
    {
      deviceId: 'uuid',
      kind: 'audioinput',
      label: '',
      groupId: group1,
    },
    {
      deviceId: 'uuid',
      kind: 'audioinput',
      label: '',
      groupId: group2,
    },

    {
      deviceId: 'uuid',
      kind: 'videoinput',
      label: 'camera1',
      groupId:
        '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
    },
    {
      deviceId: 'uuid',
      kind: 'videoinput',
      label: 'camera2',
      groupId: group2,
    },

    {
      deviceId: 'uuid',
      kind: 'audiooutput',
      label: 'speaker1',
      groupId: group1,
    },
    {
      deviceId: 'uuid',
      kind: 'audiooutput',
      label: 'speaker2',
      groupId: group1,
    },
  ]

  describe('checkPermissions', () => {
    beforeEach(() => {
      // @ts-ignore
      navigator.permissions.query.mockClear()
    })

    it("should check for permissions using the Permissions API when it's available", async () => {
      // @ts-ignore
      navigator.permissions.query.mockImplementationOnce(() => {
        return { state: 'granted' }
      })

      expect(await checkPermissions('camera')).toBe(true)
      expect(navigator.permissions.query).toHaveBeenCalledTimes(1)
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(0)
    })

    it('should fallback to the legacy check for browsers not supporting the Permissions API', async () => {
      // @ts-ignore
      navigator.permissions.query.mockImplementationOnce(() => {
        throw new Error('Not implemented')
      })

      expect(await checkPermissions('camera')).toBe(true)
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)
    })

    it('should return false if all devices have no label', async () => {
      // @ts-ignore
      navigator.permissions.query.mockImplementationOnce(() => {
        throw new Error('Not implemented')
      })

      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
        DEVICES_CAMERA_NO_LABELS
      )

      expect(await checkPermissions()).toBe(false)
    })
  })

  const getDeviceMethods = [getDevices, getDevicesWithPermissions] as const
  getDeviceMethods.forEach((getDeviceMethod) => {
    describe(getDeviceMethod, () => {
      beforeEach(() => {
        // @ts-ignore
        navigator.mediaDevices.getUserMedia.mockClear()
      })

      it('should return the device list removing the duplicates', async () => {
        const devices = await getDeviceMethod()
        expect(devices).toHaveLength(5)
      })

      it('should return the full device list', async () => {
        const devices = await getDeviceMethod(undefined, true)
        expect(devices).toHaveLength(7)
      })

      it('should return the audioIn device list with kind microphone', async () => {
        const devices = await getDeviceMethod('microphone')
        expect(devices).toHaveLength(2)
        expect(devices[0].deviceId).toEqual('default')
      })

      it('should return the video device list with kind camera', async () => {
        const devices = await getDeviceMethod('camera')
        expect(devices).toHaveLength(2)
        expect(devices[0].deviceId).toEqual(
          '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206'
        )
      })

      it('should return the audioOut device list with kind speaker', async () => {
        const devices = await getDeviceMethod('speaker')
        expect(devices).toHaveLength(1)
        expect(devices[0].deviceId).toEqual('default')
      })

      describe('without camera permissions', () => {
        it('should invoke getUserMedia to request camera permissions and return device list removing duplicates', async () => {
          // @ts-ignore
          navigator.mediaDevices.getUserMedia.mockClear()
          // @ts-ignore
          stopStream.mockClear()
          // @ts-ignore
          navigator.permissions.query.mockResolvedValueOnce()
          // @ts-ignore
          navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
            DEVICES_CAMERA_NO_LABELS
          )
          const devices = await getDeviceMethod('camera')
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: false,
            video: true,
          })
          expect(stopStream).toHaveBeenCalledTimes(1)
          expect(devices).toHaveLength(2)
          expect(devices[0].label).toEqual('FaceTime HD Camera')
          expect(devices.every((d) => d.deviceId && d.label)).toBe(true)
        })
      })

      describe('without microphone permissions', () => {
        it('should invoke getUserMedia to request microphone permissions and return device list removing duplicates', async () => {
          // @ts-ignore
          navigator.mediaDevices.getUserMedia.mockClear()
          // @ts-ignore
          navigator.permissions.query.mockResolvedValueOnce()
          // @ts-ignore
          navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
            DEVICES_MICROPHONE_NO_LABELS
          )
          const devices = await getDeviceMethod('microphone')
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: true,
            video: false,
          })
          expect(devices).toHaveLength(2)
          expect(devices[0].label).toEqual(
            'Default - External Microphone (Built-in)'
          )
          expect(devices.every((d) => d.deviceId && d.label)).toBe(true)
        })
      })
    })
  })

  describe('assureDeviceId', () => {
    beforeEach(() => {
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockClear()
    })

    it('should return the deviceId if the device is available', async () => {
      // See setup/browser.ts for these values.
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'camera'
      )
      expect(deviceId).toEqual(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206'
      )
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)
    })

    it('should return null if the device is no longer available', async () => {
      const NEW_DEVICE_LIST = [
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera1',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera2',
          groupId: group2,
        },
      ]
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockResolvedValue(NEW_DEVICE_LIST)
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'camera'
      )
      expect(deviceId).toBeNull()
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)
    })

    it('should recognize the device by its label', async () => {
      const NEW_DEVICE_LIST = [
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera1',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'new-uuid',
          kind: 'videoinput',
          label: 'FaceTime HD Camera',
          groupId: group2,
        },
      ]
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockResolvedValue(NEW_DEVICE_LIST)
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'camera'
      )
      expect(deviceId).toEqual('new-uuid')
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)
    })
  })
})
