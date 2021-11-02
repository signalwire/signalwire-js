import log from 'loglevel'
const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '')
const logger = log.getLogger('signalwire')

const originalFactory = logger.methodFactory
logger.methodFactory = (methodName, logLevel, loggerName) => {
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
    ? logger.levels.DEBUG
    : logger.getLevel()
logger.setLevel(level)

export { logger }
