import log from 'loglevel'
import { SDKLogger } from '..'

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '')
const defaultLogger = log.getLogger('signalwire')

const originalFactory = defaultLogger.methodFactory
defaultLogger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName)

  return function () {
    const messages = [datetime(), '-']
    for (let i = 0; i < arguments.length; i++) {
      messages.push(arguments[i])
    }
    rawMethod.apply(undefined, messages)
  }
}

const level =
  // @ts-ignore
  'development' === process.env.NODE_ENV
    ? defaultLogger.levels.DEBUG
    : defaultLogger.getLevel()
defaultLogger.setLevel(level)

let userLogger: SDKLogger | null

/**
 * Specify a custom logger.
 * @param logger logger object to use
 *
 * @example
 * Using the [pino](https://www.npmjs.com/package/pino) logger:
 *
 * ```javascript
 * import pino from 'pino'
 *
 * const logger = pino({
 *   level: 'trace',
 * })
 * setLogger(logger)
 * ```
 *
 * @example
 * Using the console logger:
 *
 * ```javascript
 * setLogger(console)
 * ```
 */
const setLogger = (logger: SDKLogger | null) => {
  userLogger = logger
}

const getLogger = (): SDKLogger => {
  return userLogger ?? (defaultLogger as any as SDKLogger)
}

export { setLogger, getLogger }
