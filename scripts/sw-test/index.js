require('dotenv').config({ path: '.env.test' })
const jestCli = require('jest-cli')

const getIgnoredTests = (ignoreTests) => {
  if (!ignoreTests) {
    return []
  }

  return ['-t', `^(?!(${ignoreTests.join('|')})).*`]
}

const setEnvVariables = (env) => {
  if (!env || typeof env !== 'object') {
    return
  }

  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value
  })
}

exports.cli = () => {
  const config = process.env.SW_TEST_CONFIG
    ? JSON.parse(process.env.SW_TEST_CONFIG)
    : {}
  setEnvVariables(config.env)
  jestCli.run([...getIgnoredTests(config.ignoreTests)])
}
