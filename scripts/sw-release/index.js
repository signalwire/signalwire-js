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

const getCommonTasks = () => {
  const packages = getPackages()

  return [
    {
      title: '🧪 Running test suite...',
      enabled: false,
      task: (_ctx, task) => {
        return task.newListr(
          packages.map(({ name }) => {
            return {
              title: `Testing ${name}`,
              task: () => {
                return execa('manypkg', ['run', name, 'test'], {
                  cwd: ROOT_DIR,
                })
              },
            }
          })
        )
      },
    },
  ]
}

const getDevelopmentTasks = () => {
  return [
    ...getCommonTasks(),
    {
      title: '⚒️  Preparing "development" release',
      task: async (_ctx, task) => {
        return task.newListr([
          {
            title: 'Entering pre-release mode',
            task: async () => {
              const devVersion = await getDevVersion()

              return execa(
                'npm',
                ['run', 'changeset', 'pre', 'enter', devVersion],
                {
                  cwd: ROOT_DIR,
                }
              )
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
  ]
}

const getProductionTasks = () => {
  return [...getCommonTasks()]
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
  const packages = getPackages()

  const tasks = new Listr([
    ...getModeTasks(flags),
    {
      title: `🚀 Publishing Packages`,
      task: async (_ctx, task) => {
        return task.newListr(
          packages.map(({ name }) => {
            return {
              title: `Publishing ${name}`,
              task: async () => {
                // TODO: call proper script
                await new Promise((r) => setTimeout(r, 500))
                return Promise.resolve('!!!')
              },
            }
          })
        )
      },
    },
  ])

  try {
    await tasks.run()
  } catch (e) {
    console.error(e)
  }
}
