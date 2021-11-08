import log from 'loglevel'
import type { SDKLogger, InternalSDKLogger, UserOptions } from '..'

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '')
const defaultLoggerInstance = log.getLogger('signalwire')
const defaultLogger = new Proxy(defaultLoggerInstance, {
  get(target, prop: keyof SDKLogger, receiver) {
    if (prop === 'level') {
      return defaultLoggerInstance.getLevel()
    }

    return Reflect.get(target, prop, receiver)
  },
})

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

const defaultLoggerLevel =
  // @ts-ignore
  'development' === process.env.NODE_ENV
    ? defaultLogger.levels.DEBUG
    : defaultLogger.getLevel()
defaultLogger.setLevel(defaultLoggerLevel)

let userLogger: SDKLogger | null
const setLogger = (logger: SDKLogger | null) => {
  userLogger = logger
}

let debugOptions: UserOptions['debug'] = {}
const setDebugOptions = (options: any) => {
  Object.assign(debugOptions, options)
}

const getLoggerInstance = (): SDKLogger => {
  return userLogger ?? (defaultLogger as any as SDKLogger)
}

const wsTraffic = (
  payload: Parameters<InternalSDKLogger['wsTraffic']>[0]
): void => {
  const logger = getLoggerInstance()
  const { logWsTraffic } = debugOptions || {}

  if (!logWsTraffic) {
    return undefined
  }

  if ('method' in payload) {
    const msg =
      payload.method !== 'signalwire.ping'
        ? JSON.stringify(payload, null, 2)
        : payload

    return logger.info('SEND: \n', msg, '\n')
  }

  // TODO: should we always stringify here?
  return logger.info('RECV: \n', JSON.stringify(payload, null, 2), '\n')
}

const getLogger = (): InternalSDKLogger => {
  const logger = getLoggerInstance()

  return new Proxy(logger, {
    get(target, prop: keyof InternalSDKLogger, receiver) {
      if (prop === 'wsTraffic') {
        return wsTraffic
      }

      return Reflect.get(target, prop, receiver)
    },
  }) as InternalSDKLogger
}

export { setLogger, getLogger, setDebugOptions }
