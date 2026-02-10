/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const inquirer = require('inquirer')
const watch = require('node-watch')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const ALLOWED_SCRIPT_EXTENSIONS = ['js', 'ts', 'tsx']

const getScriptOptions = (pathname) => {
  const list = fs.readdirSync(pathname)
  let acc = []
  list.forEach(function (item) {
    const itemPath = pathname + '/' + item
    if (fs.lstatSync(itemPath).isDirectory()) {
      const type = getScriptType(itemPath)
      acc.push({
        name: `[${type}] ${item}`,
        value: {
          name: item,
          type,
        },
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
      break
    }
  }

  if (!ext) {
    throw new Error(`Missing extension`)
  }

  return ext
}

const getRunParams = (script) => {
  switch (script.type) {
    case 'js':
      return ['node', [`./src/${script.name}/index.js`]]
    case 'ts':
      return [
        'node',
        ['-r', 'esbuild-register', `./src/${script.name}/index.ts`],
      ]
  }
}

const runScript = (scriptFile) => {
  const child = spawn(...getRunParams(scriptFile))

  child.stdout.on('data', (data) => {
    console.log(data.toString())
  })

  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`)
  })

  return child
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

  let child
  watch(
    path.join(__dirname, '../../', 'packages/realtime-api/dist'),
    { recursive: true },
    (_evt, name) => {
      if (name.endsWith('map')) {
        return
      }

      const newChild = runScript(answer.script)

      if (child) {
        child.stdin.pause();
        child.kill()
      }

      child = newChild
    }
  )

  child = runScript(answer.script)
}

main(process.argv)
