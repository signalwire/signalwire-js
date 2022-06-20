import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TARGET_DEPTH_LEVEL = 1
const _scan = (pathname, level = 0, acc = []) => {
  if (level > TARGET_DEPTH_LEVEL) {
    return
  }

  const list = fs.readdirSync(pathname)

  list.forEach(function (item) {
    if (!fs.lstatSync(pathname + '/' + item).isDirectory()) {
      if (item !== 'package.json') {
        return
      }

      const pkgJson = JSON.parse(
        fs.readFileSync(path.resolve(pathname, 'package.json'), 'utf-8')
      )

      if (pkgJson.private) {
        return
      }

      acc.push({
        version: pkgJson.version,
        name: pkgJson.name,
        scripts: pkgJson.scripts,
        // To be able to have packages in beta within the
        // same branch as other prod-ready packages we opted
        // for having a non-standard field that let us
        // filter packages marked as "beta" when publishing
        // production releases.
        beta: pkgJson.beta,
        pathname,
      })
    } else {
      return _scan(path.join(pathname, item), level + 1, acc)
    }
  })

  return acc
}

const PACKAGES_PATH = path.join(__dirname, '../../packages')
const DEFAULT_OPTIONS = {
  pathname: PACKAGES_PATH,
}

const getPackages = ({ pathname = PACKAGES_PATH } = DEFAULT_OPTIONS) => {
  const pkgDeps = _scan(pathname)

  return pkgDeps
}

const isDryRunFlag = (flag) => {
  return flag === '--dry-run'
}

const getDryRunFlag = (flags = []) => {
  return flags.find((f) => isDryRunFlag(f))
}

const getLastGitSha = async ({ executer }) => {
  const { stdout: sha } = await executer('git', ['log', '-1', '--format=%H'])

  return sha.substring(0, 7)
}

/** @returns execa.ExecaReturnValue<string> */
const mockedExecuter = async (command, args, _options, mockOptions) => {
  return { command: `${command} ${args.join(' ')}`, ...mockOptions }
}

/** @returns execa.ExecaReturnValue<string> */
const getExecuter = (flags) => {
  const isDryRun = getDryRunFlag(flags)

  if (isDryRun) {
    return mockedExecuter
  }

  return execa
}

const isDryRun = (flags) => {
  return getDryRunFlag(flags) ? true : false
}

const isCleanGitStatus = async ({ executer }) => {
  const status = await executer('git', ['status', '--porcelain'], undefined, {
    // @see mockedExecuter - mockOptions
    stdout: '',
  })

  if (status.stdout !== '') {
    throw new Error(
      'Git is in a dirty state. Please commit or stash your changes first.'
    )
  }

  return true
}

const isPackagePublished = async ({ name, version, executer }) => {
  const packageName = version ? `${name}@${version}` : name
  const status = await executer(
    'npm',
    ['show', packageName, 'versions'],
    undefined,
    {
      stdout: '',
    }
  )

  if (status.stdout) {
    return true
  }

  return false
}

const getNpmTag = (options) => {
  const tagIndex = options.findIndex((opt) => opt === '--tag')

  if (tagIndex === -1) {
    return ''
  }

  return options[tagIndex + 1]
}

export {
  getExecuter,
  getLastGitSha,
  getNpmTag,
  getPackages,
  isCleanGitStatus,
  isDryRun,
  isPackagePublished,
}
