import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import execa from 'execa'

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

const BUILD_MODES = ['--development', '--production', '--prepare-prod']
const isModeFlag = (flag) => {
  return BUILD_MODES.includes(flag)
}
const getModeFlag = (flags = []) => {
  return flags.find((f) => isModeFlag(f))
}

const getLastGitSha = async (length = 7) => {
  const { stdout: sha } = await execa('git', ['log', '-1', '--format=%H'])

  return sha.substring(0, length)
}

const isCleanGitStatus = async () => {
  const status = await execa('git', ['status', '--porcelain'])

  if (status.stdout !== '') {
    throw new Error(
      'Git is in a dirty state. Please commit or stash your changes first.'
    )
  }

  return true
}

const isPackagePublished = async ({ name, version }) => {
  const packageName = version ? `${name}@${version}` : name
  const status = await execa('npm', ['show', packageName, 'versions'])

  if (status.stdout) {
    return true
  }

  return false
}

export {
  getPackages,
  getModeFlag,
  getLastGitSha,
  isPackagePublished,
  isCleanGitStatus,
}
