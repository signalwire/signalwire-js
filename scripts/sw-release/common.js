import execa from 'execa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPackages, getNpmTag, isPackagePublished } from '@sw-internal/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../')

const getDryRunInfoTask = ({ dryRun, tasks }) => {
  return {
    title: '→ ℹ️  [Dry Run] Executed commands:',
    enabled: dryRun,
    task: async (_ctx, task) => {
      return task.newListr(
        () => {
          return tasks.map((task) => {
            return {
              title: task.command,
              task: () => {},
            }
          })
        },
        {
          rendererOptions: {
            collapse: false,
          },
        }
      )
    },
  }
}

const getBuildTask = ({ dryRun, executer }) => {
  let tasks = []
  return [
    {
      title: '🏗️  Build all packages...',
      task: async (_ctx, task) => {
        task.title = '🏗️  Building all packages...'
        try {
          tasks.push(
            await executer('npm', ['run', 'build'], {
              cwd: ROOT_DIR,
            })
          )
          if (dryRun) {
            task.title = 'ℹ️  [Dry Run] Build Tasks:'
          } else {
            task.title = '🏗️  Build ran successfully!'
          }
        } catch (e) {
          task.title = '🛑 Build failed.'
          throw e
        }
      },
    },
    getDryRunInfoTask({ dryRun, tasks }),
  ]
}

const getTestTask = ({ dryRun, executer }) => {
  const packages = getPackages()
  const totalPackages = packages.length
  let tasks = []

  return [
    {
      title: '🧪 Run test suites...',
      task: (_ctx, task) => {
        task.title = '🧪 Running test suites...'
        return task.newListr((parentTask) => {
          return packages.map(({ name }, index) => {
            return {
              title: `Testing ${name}`,
              task: async (_ctx, currentTask) => {
                tasks.push(
                  await executer('manypkg', ['run', name, 'test'], {
                    cwd: ROOT_DIR,
                  })
                )

                // Updates the subtask's title (the individual package)
                currentTask.title = `${name} tests ran successfully!`

                // Updates the `parent`'s task title
                if (index + 1 === totalPackages) {
                  if (dryRun) {
                    parentTask.title = `ℹ️  [Dry Run] Test Tasks:`
                  } else {
                    parentTask.title = `🧪 Test suites ran successfully!`
                  }
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
    },
    getDryRunInfoTask({ dryRun, tasks }),
  ]
}

const publishTaskFactory = (options) => {
  return [
    {
      title: `🟢 Publishing Packages`,
      task(_ctx, task) {
        const packages = getPackages()
        const totalPackages = packages.length
        const { executer, dryRun } = options

        return task.newListr(
          (parentTask) =>
            packages.map(({ name, pathname, version, beta }, index) => {
              const npmTag = getNpmTag(options.npmOptions)

              // "beta" is a non-standard package.json level
              // property we defined to be able to have beta
              // and production packages living on the same
              // branch. If we detect that a package has
              // been marked as "beta" and we're trying to
              // publish something that's not beta we'll
              // skip the package.
              if (beta && npmTag !== 'beta') {
                return {
                  title: `Skipped ${name}: package is in beta`,
                  task: () => {},
                }
              } else if (npmTag === 'beta' && !beta) {
                return {
                  title: `Skipped ${name}: package is not in beta.`,
                  task: () => {},
                }
              }

              let tasks = []
              return {
                title: `Publishing ${name}`,
                task: async (_ctx, currentTask) => {
                  // If the version we have now (locally) has
                  // been published in npm then there's no
                  // need to do anything else.
                  if (
                    await isPackagePublished({
                      name,
                      version,
                      // We ensure to always reach npm, even on dry-run
                      executer: execa,
                    })
                  ) {
                    currentTask.title = `Skipped ${name}: version: ${version} is already published on npm.`
                  } else {
                    tasks.push(
                      await executer(
                        'npm',
                        ['publish', '--dry-run', ...options.npmOptions],
                        {
                          cwd: pathname,
                        }
                      )
                    )

                    let taskTitle
                    if (options.publishGitTag) {
                      tasks.push(
                        await executer(
                          'git',
                          [
                            'tag',
                            '-a',
                            `${name}@${version}`,
                            '-m',
                            `Release ${name}@${version}`,
                          ],
                          {
                            cwd: pathname,
                          }
                        )
                      )
                      // TODO: push tag.

                      taskTitle = `${name}: Published on npm + git tag created.`
                    } else {
                      taskTitle = `${name}: Published on npm.`
                    }

                    // If we're in dry-run mode we'll
                    // replace the task title with the
                    // executed commands
                    if (dryRun) {
                      taskTitle = `→ ℹ️  [Dry Run] Executed commands for ${name}:\n${tasks
                        .map((t) => t.command)
                        .join('\n')}`
                    }

                    // Updates the subtask's title (the
                    // individual package)
                    currentTask.title = taskTitle
                  }

                  // Updates the `parent`'s task title
                  if (index + 1 === totalPackages) {
                    if (dryRun) {
                      parentTask.title = `ℹ️  [Dry Run] Packages to be published:`
                    } else {
                      parentTask.title = `🚀 All updated packages have been published!`
                    }
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
    },
  ]
}

const isProductionModeFlag = (flag) => {
  return flag === '--production'
}
const isPrepareProductionModeFlag = (flag) => {
  return flag === '--prepare-prod'
}

// We'll detect if it's either a `prepare` or `release`
const getProductionFlag = (flags = []) => {
  return flags.find(
    (f) => isProductionModeFlag(f) || isPrepareProductionModeFlag(f)
  )
}

const getReleaseType = (flags) => {
  const flag = getProductionFlag(flags)

  if (flag) {
    return {
      type: flag.includes('prepare-prod') ? 'prepare' : 'publish',
      mode: 'production',
    }
  }

  return {
    type: 'publish',
    mode: 'development',
  }
}

const BUILD_MODES = [
  '--beta',
  '--development',
  '--prepare-prod',
  '--production',
]
const isModeFlag = (flag) => {
  return BUILD_MODES.includes(flag)
}
const getModeFlag = (flags = []) => {
  return flags.find((f) => isModeFlag(f))
}

export {
  getBuildTask,
  getDryRunInfoTask,
  getModeFlag,
  getReleaseType,
  getTestTask,
  publishTaskFactory,
  ROOT_DIR,
}
