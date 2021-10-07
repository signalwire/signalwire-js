import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * List of packages that **won't** be published.
 */
const UNRELEASED_PACKAGES = ['@signalwire/web-api', '@signalwire/react-native']
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

      if (UNRELEASED_PACKAGES.includes(pkgJson.name)) {
        return
      }

      acc.push({
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

const BUILD_MODES = ['--dev', '--production']
const isModeFlag = (flag) => {
  return BUILD_MODES.includes(flag)
}
const getModeFlag = (flags = []) => {
  return flags.find((f) => isModeFlag(f))
}

export { getPackages, getModeFlag }
