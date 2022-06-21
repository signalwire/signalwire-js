import 'dotenv/config'
import { getPackages } from '@sw-internal/common'
import { execa } from 'execa'
import fs from 'fs'
import path from 'path'

const getScriptType = (scriptName) => {
  return scriptName.split(':')[1]
}

async function buildExamples(pkg) {
  const allScripts = Object.keys(pkg.scripts)

  for (const scriptName of allScripts) {
    const scriptType = getScriptType(scriptName)

    await execa('npm', ['run', scriptName], {
      cwd: pkg.pathname,
    })

    if (scriptType === 'esm') {
      fs.writeFileSync(
        path.join(pkg.pathname, 'dist/esm', 'package.json'),
        JSON.stringify({
          type: 'module',
        })
      )
    }
  }
}

async function executeExamples(pkg) {
  const allScripts = Object.keys(pkg.scripts)

  for (const scriptName of allScripts) {
    const scriptType = getScriptType(scriptName)
    const command = ['node', [`dist/${scriptType}/app.js`]]
    console.log(`🏃‍♂️ Command ⇢ "${command.join(' ')}"`)
    const { stdout } = await execa(...command, {
      cwd: pkg.pathname,
      env: process.env,
    })
    console.log(stdout)
  }
}

async function main() {
  const packages = getPackages({ pathname: 'src' })

  // --------------- Build examples ---------------
  console.log(
    '🛠  Building the examples',
    packages.map((pkg) => pkg.name)
  )
  await Promise.all(packages.map((pkg) => buildExamples(pkg)))

  // --------------- Run examples ---------------
  for (const pkg of packages) {
    console.log(`💻 Example ⇢ "${pkg.name}"`)
    await executeExamples(pkg)
  }
}

main(process.argv)
