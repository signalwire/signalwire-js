/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const ALLOWED_SCRIPT_EXTENSIONS = ['js', 'ts']

const getScriptOptions = (pathname, config) => {
  const ignoreFiles = config.ignoreFiles || []
  const includeFiles = config.includeFiles || []
  const ignoreDirectories = config.ignoreDirectories
    ? [...config.ignoreDirectories, 'playwright']
    : ['playwright']

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

    const isValidFile = fs.lstatSync(itemPath).isFile() && normalizedPath.includes('.test.')
    const isIncludedFile = (includeFiles.length == 0) || includeFiles.includes(normalizedPath)
    const isIgnoredFile = ignoreFiles.includes(normalizedPath)

    if (isValidFile && isIncludedFile && !isIgnoredFile) {
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
  let testResults = []
  let runFailed = false
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
            console.log("Adding to FAILED tests: ", test.name)
            testResults.push({ "test": test.name, "result": "FAIL", "exitCode": exitCode, "time": Date.now()})
            runFailed = true
            resolve()
          } else {
            console.log("Adding to passed tests: ", test.name)
            testResults.push({ "test": test.name, "result": "OK", "time": Date.now()})
            resolve()
          }
        })
      })
    }
  } catch (error) {
    console.error('Process Exit with errorCode', error)
    process.exit(error ?? 1)
  }
  console.log("--------- test results: ", testResults)
  console.log("-------------------------------------------")

  if (runFailed === true) {
    process.exit(1)
  }
}

exports.runNodeScript = runNodeScript
