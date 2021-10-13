import path from 'node:path'
import { fileURLToPath } from 'node:url'
import execa from 'execa'
import { Listr } from 'listr2'
import {
  getPackages,
  getModeFlag,
  getLastGitSha,
  getChangedPackages,
  isCleanGitStatus,
} from '@sw-internal/common'

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

const getBuildTask = () => {
  return {
    title: '🏗️  Building all packages...',
    task: async (_ctx, currentTask) => {
      try {
        await execa('npm', ['run', 'build'], {
          cwd: ROOT_DIR,
        })
        currentTask.title = '🏗️  Build ran successfully!'
      } catch (e) {
        currentTask.title = '🛑 Build failed.'
        throw e
      }
    },
  }
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
    packages,
  }
) => {
  return {
    title: `🟢 Publishing Packages`,
    task(_ctx, task) {
      const packages = getChangedPackages(options.packages)
      const totalPackages = packages.length

      return task.newListr(
        (parentTask) =>
          packages.map(({ name, pathname }, index) => {
            return {
              title: `Publishing ${name}`,
              task: async (_ctx, currentTask) => {
                await execa('npm', ['publish', ...options.npmOptions], {
                  cwd: pathname,
                })

                // Updates the subtask's title (the individual package)
                currentTask.title = `${name}`

                // Updates the `parent`'s task title
                if (index + 1 === totalPackages) {
                  parentTask.title = `🚀 All updated packages have been published!`
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

const getDevelopmentTasks = ({ packages }) => {
  return [
    getBuildTask(),
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
    publishTaskFactory({
      npmOptions: ['--tag', 'dev'],
      packages,
    }),
  ]
}

const getProductionTasks = () => {
  return [
    getBuildTask(),
    getTestTask(),
    {
      title: '🔍 Checking Git status',
      task: async (_ctx, task) => {
        try {
          await isCleanGitStatus()
          task.title = '🔍 Git: clean working tree!'
        } catch (e) {
          task.title = `🛑 ${e.message}`

          return Promise.reject('')
        }
      },
    },
  ]
}

const getPrepareProductionTasks = () => {
  return [
    getBuildTask(),
    getTestTask(),
    {
      title: '⚒️  Preparing "production" release',
      task: async () => {
        return execa('npm', ['run', 'changeset', 'version'], {
          cwd: ROOT_DIR,
        })
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
  // We get a reference of the original packages to detect
  // changes. Only packages with versions will be published.
  const packages = getPackages()

  switch (mode) {
    case '--development': {
      return getDevelopmentTasks({ flags, packages })
    }
    case '--production': {
      return getProductionTasks({ flags, packages })
    }
    case '--prepare-prod': {
      return getPrepareProductionTasks({ flags, packages })
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
