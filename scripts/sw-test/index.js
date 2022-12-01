require('dotenv').config({ path: '.env.test' })
const jestCli = require('jest-cli')
const { execSync } = require('node:child_process')
const { runNodeScript } = require('./runNodeScript')

const getIgnoredTests = (ignoreTests, mode) => {
  if (!ignoreTests) {
    return []
  }

  if (mode === 'jest') {
    return ['-t', `^(?!(${ignoreTests.join('|')})).*`]
  } else if (mode === 'playwright') {
    return ['--grep-invert', `(${ignoreTests.join('|')})`]
  }
  return []
}

const injectEnvVariables = (env) => {
  if (!env || typeof env !== 'object') {
    throw 'Invalid config.env. Double check ENV variables'
  }

  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value
  })
}

const TEST_MODES = ['jest', 'playwright', 'custom-node']

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
      return jestCli.run([...getIgnoredTests(config.ignoreTests, mode)])
    }
    case 'playwright': {
      const runCommand = 'npx playwright test'
      const ignoredTests = getIgnoredTests(config.ignoreTests, mode)
      const command =
        ignoredTests.length > 0
          ? `${runCommand} ${ignoredTests[0]} "${ignoredTests[1]}"`
          : runCommand
      try {
        console.time('Playwright Tests')
        execSync(command, { stdio: 'inherit' })
        console.log('\n')
        console.timeEnd('Playwright Tests')
        console.log(`Playwright Done ${new Date().toISOString()}`)
      } catch (error) {
        console.log(
          `Playwright exitCode: ${error.status}. Message: '${error.message}'`
        )
        process.exit(error.status)
      }
      break
    }
    case 'custom-node': {
      return runNodeScript(config)
    }
  }
}

exports.cli = (args) => {
  const config = JSON.parse(process.env.SW_TEST_CONFIG)
  if (!config) {
    throw 'Missing ENV variable: "SW_TEST_CONFIG"'
  }
  injectEnvVariables(config.env)
  const flags = args.slice(2)
  const mode = getMode(flags)
  return runTests(mode, config)
}
