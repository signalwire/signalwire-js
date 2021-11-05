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
const setLogger = (logger: SDKLogger | null) => {
  userLogger = logger
}

const trace = (...params: Parameters<SDKLogger['trace']>) => {
  const logger = userLogger ?? (defaultLogger as any as SDKLogger)

  // TODO: add conditionals based on flags.
  return logger.info(...params)
}

const getLogger = (): SDKLogger => {
  const logger = userLogger ?? (defaultLogger as any as SDKLogger)

  return new Proxy<SDKLogger>(logger, {
    get(target, prop: keyof SDKLogger, receiver) {
      if (prop === 'trace') {
        return trace
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

export { setLogger, getLogger }
