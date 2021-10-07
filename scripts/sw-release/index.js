import path from 'node:path'
import { fileURLToPath } from 'node:url'
import execa from 'execa'
import { Listr } from 'listr2'
import { getPackages, getModeFlag, getLastGitSha } from '@sw-internal/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../')

const getDevVersion = async () => {
  const sha = await getLastGitSha()

  const d = new Date()

  let timestamp = d.getUTCFullYear().toString()
  timestamp += (d.getUTCMonth() + 1).toString().padStart(2, '0')
  timestamp += d.getUTCDate().toString().padStart(2, '0')
  timestamp += d.getUTCHours().toString().padStart(2, '0')
  timestamp += d.getUTCMinutes().toString().padStart(2, '0')

  await new Promise((r) => setTimeout(r, 3000))

  return `dev.${timestamp}.${sha}`
}

const getTestTask = () => {
  const packages = getPackages()
  const totalPackages = packages.length

  return {
    title: '🧪 Running test suites...',
    task: (_ctx, task) => {
      return task.newListr((parentTask) => {
        return packages.map(({ name }, index) => {
          return {
            title: `Testing ${name}`,
            task: async (_ctx, currentTask) => {
              await execa('manypkg', ['run', name, 'test'], {
                cwd: ROOT_DIR,
              })

              // Updates the subtask's title (the individual package)
              currentTask.title = `${name} tests ran successfully!`

              // Updates the `parent`'s task title
              if (index + 1 === totalPackages) {
                parentTask.title = `🧪 Test suites ran successfully!`
              } else {
                parentTask.title = `🟢 Ran ${index + 1} of ${
                  packages.length
                } test suites.`
              }
            },
          }
        })
      })
    },
  }
}

const publishTaskFactory = (
  options = {
    npmOptions: [],
  }
) => {
  const packages = getPackages()
  const totalPackages = packages.length

  return {
    title: `🟢 Publishing Packages`,
    task(_ctx, task) {
      return task.newListr(
        (parentTask) =>
          packages.map(({ name, pathname }, index) => {
            return {
              title: `Publishing ${name}`,
              task: async (_ctx, currentTask) => {
                await execa(
                  'npm',
                  // TODO: remove --dry-run
                  ['publish', '--dry-run', ...options.npmOptions],
                  {
                    cwd: pathname,
                  }
                )

                // Updates the subtask's title (the individual package)
                currentTask.title = `${name}`

                // Updates the `parent`'s task title
                if (index + 1 === totalPackages) {
                  parentTask.title = `🚀 All packages have been published!`
                } else {
                  parentTask.title = `🟢 Published ${index + 1} of ${
                    packages.length
                  } Packages`
                }
              },
            }
          }),
        {
          rendererOptions: {
            /**
             * This option will keep the subtasks list opened
             * after completion. This is useful to see exactly
             * which packages were published.
             */
            collapse: false,
          },
        }
      )
    },
  }
}

const getDevelopmentTasks = () => {
  return [
    getTestTask(),
    {
      title: '⚒️  Preparing "development" release',
      task: async (_ctx, task) => {
        return task.newListr([
          {
            title: 'Entering pre-release mode',
            task: async () => {
              const devVersion = await getDevVersion()

              await execa(
                'npm',
                ['run', 'changeset', 'pre', 'enter', devVersion],
                {
                  cwd: ROOT_DIR,
                }
              )

              task.title = '⚒️  "development" release ready to be published.'
            },
          },
          {
            title: 'Versioning packages',
            task: async () => {
              return execa('npm', ['run', 'changeset', 'version'], {
                cwd: ROOT_DIR,
              })
            },
          },
        ])
      },
    },
    // TODO: add dev-specific options
    publishTaskFactory(),
  ]
}

const getProductionTasks = () => {
  return [getTestTask()]
}

const getModeTasks = (flags) => {
  const mode = getModeFlag(flags) || '--development'

  switch (mode) {
    case '--development': {
      return getDevelopmentTasks(flags)
    }
    case '--production': {
      return getProductionTasks(flags)
    }
  }
}

export async function cli(args) {
  const flags = args.slice(2)
  const tasks = new Listr([...getModeTasks(flags)])

  try {
    await tasks.run()
  } catch (e) {
    console.error(e)
  }
}
