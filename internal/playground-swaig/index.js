const inquirer = require('inquirer')
const watch = require('node-watch')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const runScript = (scriptFile) => {
  const child = spawn(...['node', ['-r', 'esbuild-register', scriptFile]])

  child.stdout.on('data', (data) => {
    console.log(data.toString())
  })

  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`)
  })

  return child
}

async function main() {
  const playground = path.join(__dirname, './src/index.ts')

  let child
  watch(
    [
      path.join(__dirname, '../../', 'packages/swaig/dist'),
      path.join(__dirname, 'src'),
    ],
    { recursive: true },
    (_evt, name) => {
      if (name.endsWith('map')) {
        return
      }

      const newChild = runScript(playground)

      if (child) {
        child.stdin.pause()
        child.kill()
      }

      child = newChild
    }
  )

  child = runScript(playground)
}

main(process.argv)
