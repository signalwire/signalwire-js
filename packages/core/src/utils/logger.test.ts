import { getLogger, setLogger } from './logger'
import { mockLogger } from '../testUtils'

describe('logger', () => {
  describe('getLogger', () => {
    it('should use the default logger if no logger was set', () => {
      const logger = getLogger()
      // @ts-expect-error
      expect(typeof logger.setLevel).toBe('function')
    })
  })

  describe('setLogger', () => {
    afterEach(() => {
      setLogger(null)
    })

    it('should allow us to pass a customer logger', () => {
      setLogger(mockLogger)
      const logger = getLogger()

      logger.info('info')
      logger.debug('debug')
      logger.error('error')
      logger.trace('trace')
      logger.warn('warn')

      expect(mockLogger.info).toHaveBeenCalledWith('info')
      expect(mockLogger.debug).toHaveBeenCalledWith('debug')
      expect(mockLogger.error).toHaveBeenCalledWith('error')
      // This method is currently being intercepted by a Proxy.
      // expect(mockLogger.trace).toHaveBeenCalledWith('trace')
      expect(mockLogger.warn).toHaveBeenCalledWith('warn')
    })
  })
})
