import execa from 'execa'
import {
  getBuildTask,
  getTestTask,
  ROOT_DIR,
  publishTaskFactory,
} from '../common.js'

const getBetaTasks = ({ dryRun, executer }) => {
  return [
    ...getBuildTask({ dryRun, executer }),
    ...getTestTask({ dryRun, executer }),
    {
      title: '⚒️  Preparing "beta" release',
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
              const status = await localExecuter(
                'npm',
                ['run', 'changeset', 'pre', 'enter', 'beta'],
                {
                  cwd: ROOT_DIR,
                }
              )

              if (dryRun) {
                task.title = `→ ℹ️  [Dry Run] Executed commands: ${status.command}`
              } else {
                task.title = '⚒️  "beta" release ready to be published.'
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
      npmOptions: ['--tag', 'beta'],
      executer,
      dryRun,
    }),
  ]
}

export { getBetaTasks }
