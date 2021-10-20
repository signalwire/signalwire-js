import { isCleanGitStatus } from '@sw-internal/common'
import {
  getBuildTask,
  getInstallDependenciesTask,
  getTestTask,
  publishTaskFactory,
} from '../common.js'

const getProductionTasks = ({ flags, executer, dryRun }) => {
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
    ...getInstallDependenciesTask({ flags, dryRun, executer }),
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

export { getProductionTasks }
