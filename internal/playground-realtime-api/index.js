/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const inquirer = require('inquirer')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const ALLOWED_SCRIPT_EXTENSIONS = ['js', 'ts', 'tsx']

const getScriptOptions = (pathname) => {
  const list = fs.readdirSync(pathname)
  let acc = []
  list.forEach(function (item) {
    if (fs.lstatSync(pathname + '/' + item).isDirectory()) {
      acc.push(item)
    }
  })

  return acc
}

const TARGET_DEPTH_LEVEL = 1
/**
 * The Script type will be determined by the extension of
 * its `index` file. Check `ALLOWED_SCRIPT_EXTENSIONS` for
 * more info on allowed extensions.
 */
const getScriptType = (pathname, level = 0) => {
  if (level > TARGET_DEPTH_LEVEL) {
    return
  }

  const list = fs.readdirSync(pathname)

  let ext
  for (const item of list) {
    if (!fs.lstatSync(pathname + '/' + item).isDirectory()) {
      if (!item.startsWith('index.')) {
        continue
      }

      const tempExt = item.split('.').pop()

      if (!ALLOWED_SCRIPT_EXTENSIONS.includes(tempExt)) {
        throw new Error(
          `Unsupported extension: ${tempExt}. Used in ${pathname}'/${item}`
        )
      }

      ext = tempExt
    } else {
      return getScriptType(path.join(pathname, item), level + 1)
    }
  }

  if (!ext) {
    throw new Error(`Missing extension`)
  }

  return ext
}

const getRunParams = (pathname) => {
  const ext = getScriptType(`./src/${pathname}`)

  switch (ext) {
    case 'js':
      return ['node', [`./src/${pathname}/index.js`]]
    case 'ts':
      return ['node', ['-r', 'esbuild-register', `./src/${pathname}/index.ts`]]
  }
}

async function main() {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'script',
      choices: getScriptOptions(path.join(__dirname, './src')),
      message: 'Select an example to run:',
    },
  ])

  const child = spawn(...getRunParams(answer.script))

  child.stdout.on('data', (data) => {
    console.log(data.toString())
  })

  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`)
  })

  child.on('close', () => {
    process.exit(0)
  })
}

main(process.argv)
