import execa from 'execa'
import inquirer from 'inquirer'
import { Listr } from 'listr2'

import {
  getLastGitSha,
  isCleanGitStatus,
  getExecuter,
  isDryRun,
} from '@sw-internal/common'

import {
  getModeFlag,
  getReleaseType,
  getBuildTask,
  getTestTask,
  ROOT_DIR,
  publishTaskFactory,
} from './common.js'

const getDevVersion = async () => {
  // we need to execute this even on --dry-run to properly
  // generate the new version number.
  const sha = await getLastGitSha({ executer: execa })

  const d = new Date()

  let timestamp = d.getUTCFullYear().toString()
  timestamp += (d.getUTCMonth() + 1).toString().padStart(2, '0')
  timestamp += d.getUTCDate().toString().padStart(2, '0')
  timestamp += d.getUTCHours().toString().padStart(2, '0')
  timestamp += d.getUTCMinutes().toString().padStart(2, '0')

  await new Promise((r) => setTimeout(r, 3000))

  return `dev.${timestamp}.${sha}`
}

const getDevelopmentTasks = ({ dryRun, executer }) => {
  return [
    ...getBuildTask({ dryRun, executer }),
    ...getTestTask({ dryRun, executer }),
    {
      title: '⚒️  Preparing "development" release',
      task: async (_ctx, task) => {
        // We need to execute these tasks regardless if
        // we're in dry-run mode or not otherwise the output
        // won't be useful since packages will have the same
        // version during the publishing phase
        const localExecuter = execa
        return task.newListr([
          {
            title: 'Entering pre-release mode',
            task: async () => {
              const devVersion = await getDevVersion()

              const status = await localExecuter(
                'npm',
                ['run', 'changeset', 'pre', 'enter', devVersion],
                {
                  cwd: ROOT_DIR,
                }
              )

              if (dryRun) {
                task.title = `→ ℹ️  [Dry Run] Executed commands: ${status.command}`
              } else {
                task.title = '⚒️  "development" release ready to be published.'
              }
            },
          },
          {
            title: 'Versioning packages',
            task: async () => {
              return localExecuter('npm', ['run', 'changeset', 'version'], {
                cwd: ROOT_DIR,
              })
            },
          },
        ])
      },
    },
    ...publishTaskFactory({
      npmOptions: ['--tag', 'dev'],
      executer,
      dryRun,
    }),
  ]
}

const getProductionTasks = ({ executer, dryRun }) => {
  return [
    {
      title: '🔍 Checking Git status',
      task: async (_ctx, task) => {
        try {
          await isCleanGitStatus({ executer })
          task.title = '🔍 Git: clean working tree!'
        } catch (e) {
          task.title = `🛑 ${e.message}`

          return Promise.reject('')
        }
      },
    },
    ...getBuildTask({ dryRun, executer }),
    ...getTestTask({ dryRun, executer }),
    ...publishTaskFactory({
      npmOptions: [],
      publishGitTag: true,
      executer,
      dryRun,
    }),
  ]
}

const getPrepareProductionTasks = ({ dryRun, executer }) => {
  return [
    ...getBuildTask({ dryRun, executer }),
    ...getTestTask({ dryRun, executer }),
    {
      title: '⚒️  Prepare "production" release',
      task: async (_ctx, task) => {
        task.title = '⚒️  Preparing "production" release'
        const status = await executer('npm', ['run', 'changeset', 'version'], {
          cwd: ROOT_DIR,
        })

        if (dryRun) {
          task.title = `→ ℹ️  [Dry Run] Executed commands: ${status.command}`
        } else {
          task.title = `⚒️  "production" release ready to be published: ${status.command}`
        }
      },
    },
    {
      title: '📝 Next Steps',
      task: async (_ctx, task) => {
        return task.newListr(
          [
            {
              title: '1. Verify/Modify all the affected CHANGELOG.md files',
              task: () => {},
            },
            {
              title: '2. `git commit -m "<release-message>`',
              task: () => {},
            },
            {
              title: '3. `npm run release:prod`',
              task: () => {},
            },
          ],
          {
            rendererOptions: {
              collapse: false,
            },
          }
        )
      },
    },
  ]
}

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
