import path from 'node:path'
import execa from 'execa'
import inquirer from 'inquirer'
import { Listr } from 'listr2'
import { fileURLToPath } from 'node:url'
import {
  getPackages,
  getModeFlag,
  getLastGitSha,
  isPackagePublished,
  isCleanGitStatus,
  getExecuter,
  isDryRun,
  getReleaseType,
  getNpmTag,
} from '@sw-internal/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../')

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
  const executer = getExecuter({ flags })
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
