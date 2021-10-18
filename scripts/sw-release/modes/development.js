import execa from 'execa'
import { getLastGitSha } from '@sw-internal/common'
import {
  getBuildTask,
  getTestTask,
  ROOT_DIR,
  publishTaskFactory,
} from '../common.js'

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

export { getDevelopmentTasks }
