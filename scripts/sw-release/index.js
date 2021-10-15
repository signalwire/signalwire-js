import inquirer from 'inquirer'
import { Listr } from 'listr2'
import { getExecuter, isDryRun } from '@sw-internal/common'
import { getModeFlag, getReleaseType } from './common.js'
import { getDevelopmentTasks } from './modes/development.js'
import { getProductionTasks } from './modes/production.js'
import { getPrepareProductionTasks } from './modes/prepareProd.js'

const getModeTasks = (flags) => {
  const mode = getModeFlag(flags) || '--development'
  // When using --dry-run we'll use a mocked version of `execa`
  const executer = getExecuter(flags)
  const dryRun = isDryRun(flags)

  switch (mode) {
    case '--development': {
      return getDevelopmentTasks({ flags, executer, dryRun })
    }
    case '--production': {
      return getProductionTasks({ flags, executer, dryRun })
    }
    case '--prepare-prod': {
      return getPrepareProductionTasks({ flags, executer, dryRun })
    }
  }
}

const getExtendedFlags = async (flags) => {
  const dryRun = isDryRun(flags)
  const releaseType = getReleaseType(flags)

  if (!dryRun) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: `**Important**:\nYou're about to ${releaseType.type} a ${releaseType.mode} release.\nWould you like to run it in --dry-mode first?`,
        default: true,
      },
    ])

    if (answer.continue) {
      return [...flags, '--dry-run']
    }
  }

  return flags
}

export async function cli(args) {
  const userFlags = args.slice(2)
  const flags = await getExtendedFlags(userFlags)
  const tasks = new Listr([...getModeTasks(flags)])

  try {
    await tasks.run()
  } catch (e) {
    console.error(e)
  }
}
