import { logger } from '@signalwire/core'
import { getUserMedia } from './webrtcHelpers'

describe('WebRTC Helpers', () => {
  describe('getUserMedia', () => {
    let loggerErrorSpy: jest.SpyInstance
    beforeEach(() => {
      loggerErrorSpy = jest
        .spyOn(logger, 'error')
        .mockImplementationOnce(() => {})
    })
    afterEach(() => {
      loggerErrorSpy.mockClear()
      // @ts-ignore
      navigator.mediaDevices.getUserMedia.mockClear()
    })

    it('should throw for environments not supporting getUserMedia', async () => {
      jest.fn().mockResolvedValueOnce
      // @ts-ignore
      navigator.mediaDevices.getUserMedia.mockImplementationOnce(() => {
        throw new Error('Not implemented')
      })

      try {
        getUserMedia({})
      } catch (e) {
        expect(e.name).toBe('Error')
      }
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('should log a helpful message when no constraints have been passed', async () => {
      try {
        getUserMedia({})
      } catch (e) {
        expect(e.name).toBe('TypeError')
      }
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    })
  })
})
