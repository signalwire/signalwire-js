import {
  getBuildTask,
  getInstallDependenciesTask,
  getTestTask,
  ROOT_DIR,
} from '../common.js'

const getPrepareProductionTasks = ({ flags, dryRun, executer }) => {
  return [
    ...getInstallDependenciesTask({ flags, dryRun, executer }),
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

export { getPrepareProductionTasks }
