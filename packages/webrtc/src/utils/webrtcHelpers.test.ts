import { logger } from '@signalwire/core'
import { getUserMedia } from './webrtcHelpers'

describe('WebRTC Helpers', () => {
  describe('getUserMedia', () => {
    let loggerErrorSpy: jest.SpyInstance
    beforeEach(() => {
      loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should log a helpful message when no constraints have been passed', async () => {
      expect(() => getUserMedia({})).toThrowErrorMatchingInlineSnapshot()
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    })
  })
})
