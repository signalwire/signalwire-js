import log from 'loglevel'
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

let userLogger: any
const setLogger = (logger: any) => {
  userLogger = logger
  console.log('---> userLogger', userLogger, logger)
  // logger = userLogger
}

const getLogger = () => {
  return userLogger ?? defaultLogger
}

export { setLogger, getLogger }
