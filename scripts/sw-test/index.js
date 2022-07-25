require('dotenv').config({ path: '.env.test' })
const jestCli = require('jest-cli')
const { exec } = require('node:child_process')

const getIgnoredTests = (ignoreTests) => {
  if (!ignoreTests) {
    return []
  }

  return ['-t', `^(?!(${ignoreTests.join('|')})).*`]
}

const injectEnvVariables = (env) => {
  if (!env || typeof env !== 'object') {
    return
  }

  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value
  })
}

const TEST_MODES = ['jest', 'playwright']

const getMode = (flags) => {
  const modeFlag = flags.find((f) => f.startsWith('--mode'))

  if (!modeFlag) {
    return 'jest'
  }

  const parts = modeFlag.split('=')

  if (parts.length === 1) {
    throw new Error(
      `You must specify a mode when --mode is passed. Available options: ${TEST_MODES.join(
        ' | '
      )}`
    )
  }

  const mode = parts[1].trim()

  if (!TEST_MODES.includes(mode)) {
    throw new Error(
      `Invalid option for --mode. Available options: ${TEST_MODES.join(' | ')}`
    )
  }

  return mode
}

const runTests = (mode, config) => {
  switch (mode) {
    case 'jest': {
      injectEnvVariables(config.env)
      return jestCli.run([...getIgnoredTests(config.ignoreTests)])
    }
    case 'playwright': {
      const runCommand = 'npx playwright test'
      injectEnvVariables(config.env)
      const child = exec(runCommand)

      child.stdout.on('data', (data) => {
        console.log(data.toString())
      })

      child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`)
      })
    }
  }
}

exports.cli = (args) => {
  const config = process.env.SW_TEST_CONFIG
    ? JSON.parse(process.env.SW_TEST_CONFIG)
    : {}
  const flags = args.slice(2)
  const mode = getMode(flags)
  return runTests(mode, config)
}
