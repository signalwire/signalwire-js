/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const ALLOWED_SCRIPT_EXTENSIONS = ['js', 'ts']

const E2E_REALTIME_API_IGNORED_DIRECTORIES = [
  'voiceCollect',
  'voiceDetect',
  'voicePlayback',
  'voicePrompt',
  'voiceRecord',
]
const E2E_REALTIME_API_IGNORED_FILES = [
  'messaging.test.ts',
  'task.test.ts',
  'voice.test.ts',
  'voicePass.test.ts',
  'voiceTapAllListeners.test.ts',
]

const getScriptOptions = (pathname, config) => {
  const ignoreFiles = config.ignoreFiles || []
  const ignoreDirectories = config.ignoreDirectories
    ? [...config.ignoreDirectories, 'playwright']
    : ['playwright']

  // FIXME: Temporary to run only Chat/PubSub tests
  ignoreFiles.push(...E2E_REALTIME_API_IGNORED_FILES)
  ignoreDirectories.push(...E2E_REALTIME_API_IGNORED_DIRECTORIES)

  let acc = []

  const processItem = (item, basePath = '') => {
    const itemPath = basePath + '/' + item

    if (
      fs.lstatSync(itemPath).isDirectory() &&
      !ignoreDirectories.includes(item)
    ) {
      const childList = fs.readdirSync(itemPath)
      childList.forEach((childItem) => processItem(childItem, itemPath))
    }

    const relativePath = path.relative(path.join(pathname, 'src'), itemPath)
    const normalizedPath = relativePath
      .replace(/\.\.(\/|\\)/g, '')
      .replace(/\\/g, '/')

    if (
      fs.lstatSync(itemPath).isFile() &&
      normalizedPath.includes('.test.') &&
      !ignoreFiles.includes(normalizedPath)
    ) {
      acc.push({
        name: normalizedPath,
        type: getScriptType(itemPath),
      })
    }
  }

  const list = fs.readdirSync(pathname)
  list.forEach((item) => processItem(item, pathname))

  return acc
}

/**
 * The script type will be determined by the extension of
 * its `index` file. Check `ALLOWED_SCRIPT_EXTENSIONS` to
 * see allowed extensions.
 */
const getScriptType = (pathname) => {
  const ext = pathname.split('.').pop()
  if (!ALLOWED_SCRIPT_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported extension: ${ext}. Used in ${pathname}'/${item}`
    )
  }

  return ext
}

const getRunParams = (script) => {
  switch (script.type) {
    case 'js':
      return ['node', [`./src/${script.name}`]]
    case 'ts':
      return ['node', ['-r', 'esbuild-register', `./src/${script.name}`]]
  }
}

async function runNodeScript(config) {
  const tests = getScriptOptions(path.join(process.cwd(), './src'), config)
  try {
    for await (const test of tests) {
      await new Promise((resolve, reject) => {
        console.log('Running Test', test.name)
        const child = spawn(...getRunParams(test))

        child.stdout.on('data', (data) => {
          console.log(data.toString())
        })

        child.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`)
        })

        child.on('close', (exitCode) => {
          if (exitCode !== 0) {
            reject(exitCode)
          }
          resolve()
        })
      })
    }
  } catch (error) {
    console.error('Process Exit with errorCode', error)
    process.exit(error ?? 1)
  }
}

exports.runNodeScript = runNodeScript
