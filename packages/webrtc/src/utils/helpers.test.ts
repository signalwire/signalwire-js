import { getMediaConstraints } from '../utils/helpers'
import { assureDeviceId } from './deviceHelpers'

jest.mock('../utils/deviceHelpers', () => ({
  assureDeviceId: jest
    .fn()
    .mockImplementation(async (p: any) => Promise.resolve(p)),
}))

describe('Helpers', () => {
  describe('getMediaConstraints', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return default audio and video constraints when no micId or camId are provided', async () => {
      const options = {
        audio: true,
        video: false,
      }
      const result = await getMediaConstraints(options)

      expect(result).toEqual({
        audio: true,
        video: false,
      })
    })

    it('should set deviceId for audio if micId is provided', async () => {
      const options = {
        audio: true,
        micId: 'test-mic-id',
        micLabel: 'Test Microphone',
      }
      ;(assureDeviceId as jest.Mock).mockResolvedValue('new-mic-id')

      const result = await getMediaConstraints(options)

      expect(assureDeviceId).toHaveBeenCalledWith(
        'test-mic-id',
        'Test Microphone',
        'microphone'
      )
      expect(result).toEqual({
        audio: { deviceId: { exact: 'new-mic-id' } },
        video: false,
      })
    })

    it('should set deviceId for video if camId is provided', async () => {
      const options = {
        video: true,
        camId: 'test-cam-id',
        camLabel: 'Test Camera',
      }
      ;(assureDeviceId as jest.Mock).mockResolvedValue('new-cam-id')

      const result = await getMediaConstraints(options)

      expect(assureDeviceId).toHaveBeenCalledWith(
        'test-cam-id',
        'Test Camera',
        'camera'
      )
      expect(result).toEqual({
        audio: true,
        video: { deviceId: { exact: 'new-cam-id' } },
      })
    })

    it('should set both audio and video deviceId if micId and camId are provided', async () => {
      const options = {
        audio: true,
        micId: 'test-mic-id',
        micLabel: 'Test Microphone',
        video: true,
        camId: 'test-cam-id',
        camLabel: 'Test Camera',
      }
      ;(assureDeviceId as jest.Mock)
        .mockResolvedValueOnce('new-mic-id')
        .mockResolvedValueOnce('new-cam-id')

      const result = await getMediaConstraints(options)

      expect(assureDeviceId).toHaveBeenCalledWith(
        'test-mic-id',
        'Test Microphone',
        'microphone'
      )
      expect(assureDeviceId).toHaveBeenCalledWith(
        'test-cam-id',
        'Test Camera',
        'camera'
      )
      expect(result).toEqual({
        audio: { deviceId: { exact: 'new-mic-id' } },
        video: { deviceId: { exact: 'new-cam-id' } },
      })
    })

    it('should return default audio and video when assureDeviceId rejects', async () => {
      const options = {
        audio: true,
        micId: 'test-mic-id',
        micLabel: 'Test Microphone',
        video: true,
        camId: 'test-cam-id',
        camLabel: 'Test Camera',
      }
      ;(assureDeviceId as jest.Mock)
        .mockRejectedValueOnce(null)
        .mockRejectedValueOnce(null)

      const result = await getMediaConstraints(options)

      expect(result).toEqual({
        audio: true,
        video: true,
      })
    })
  })
})
