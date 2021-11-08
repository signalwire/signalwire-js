import log from 'loglevel'
import type { SDKLogger, UserOptions } from '..'

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

// TODO: find a better place to place this.
const WS_MESSAGES_PREFIX = ['RECV:', 'SEND:']
const isWsTraffic = (msg: string) => {
  return WS_MESSAGES_PREFIX.some((wsPrefix) => msg.startsWith(wsPrefix))
}

const trace = (...params: Parameters<SDKLogger['trace']>): void => {
  const logger = getLoggerInstance()
  const { logWsTraffic } = debugOptions || {}

  if (isWsTraffic(params[0])) {
    // If the user set `logWsTraffic: true` we'll
    if (logWsTraffic) {
      // TODO: pick the appropiate fn based o
      return logger.info(...params)
    } else {
      return undefined
    }
  }

  return logger.trace(...params)
}

const getLogger = (): SDKLogger => {
  const logger = getLoggerInstance()

  return new Proxy<SDKLogger>(logger, {
    get(target, prop: keyof SDKLogger, receiver) {
      if (prop === 'trace') {
        return trace
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

export { setLogger, getLogger, setDebugOptions }
