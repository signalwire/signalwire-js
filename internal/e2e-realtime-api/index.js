/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const ALLOWED_SCRIPT_EXTENSIONS = ['js', 'ts']

const getScriptOptions = (pathname) => {
  const list = fs.readdirSync(pathname)
  let acc = []
  list.forEach(function (item) {
    const itemPath = pathname + '/' + item
    if (fs.lstatSync(itemPath).isFile() && item.includes('.test.')) {
      acc.push({
        name: item,
        type: getScriptType(itemPath),
      })
    }
  })

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

async function main() {
  const tests = getScriptOptions(path.join(__dirname, './src'))
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
    process.exit(error)
  }
}

main(process.argv)
