/**
 * Note: File is written using CommonJS because spawning a
 * process from within an ESModule context is breaking the
 * load of the example code using `-r esbuild-register`
 */
const inquirer = require('inquirer')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const getFolders = (pathname) => {
  const list = fs.readdirSync(pathname)
  let acc = []
  list.forEach(function (item) {
    if (fs.lstatSync(pathname + '/' + item).isDirectory()) {
      acc.push(item)
    }
  })

  return acc
}

async function main() {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'script',
      choices: getFolders(path.join(__dirname, './src')),
      message: 'Select an example to run:'
    },
  ])

  const child = spawn(
    'node',
    ['-r', 'esbuild-register', `./src/${answer.script}/index.ts`]
  )

  child.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  child.on('close', () => {
    process.exit(0)
  });
}

main(process.argv)
