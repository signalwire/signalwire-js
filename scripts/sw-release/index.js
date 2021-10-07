import path from 'node:path'
import { fileURLToPath } from 'node:url'
import execa from 'execa'
import { Listr } from 'listr2'
import { getPackages, getModeFlag } from '@sw-internal/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../')

const getCommonTasks = () => {
  const packages = getPackages()

  return [
    {
      title: '🧪 Running test suite...',
      task: (_ctx, task) =>
        task.newListr(
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
        ),
    },
  ]
}

const getDevelopmentTasks = () => {
  return [
    ...getCommonTasks(),
    {
      title: '⚒️ Preparing "development" release',
      task: async () => {
        await new Promise((r) => setTimeout(r, 500))
        return Promise.resolve('!!!')
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
      return getDevelopmentTasks()
    }
    case '--production': {
      return getProductionTasks()
    }
  }
}

export async function cli(args) {
  const flags = args.slice(2)
  const packages = getPackages()

  const tasks = new Listr([
    ...getModeTasks(flags),
    ...packages.map(({ name }) => {
      return {
        title: `Publishing ${name}`,
        task: async () => {
          await new Promise((r) => setTimeout(r, 500))
          return Promise.resolve('!!!')
        },
      }
    }),
  ])

  try {
    await tasks.run()
  } catch (e) {
    console.error(e)
  }
}
