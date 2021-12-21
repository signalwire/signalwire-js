import concurrently from 'concurrently'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Max depth level we'll navigate through folders.
 */
const TARGET_DEPTH_LEVEL = 1

const parsePackageName = (pathname) => {
  const parts = pathname.split(path.sep)
  const swIndex = parts.findIndex(
    (p) => p === '@signalwire' || p === 'packages'
  )

  return parts[swIndex + 1]
}

export async function cli(args) {
  /**
   * List of packages that have no dependencies and can be built right
   * away
   */
  const packagesWithNoDeps = new Set()

  const buildTree = (tree, acc, ite = 1, processedPackages = []) => {
    tree.forEach((deps, key) => {
      if (
        deps.every(
          (dep) =>
            packagesWithNoDeps.has(dep) || processedPackages.includes(dep)
        )
      ) {
        const list = acc.get(ite) || []
        acc.set(ite, [...list, key])
        processedPackages.push(key)
        tree.delete(key)
      }
    })

    if (tree.size > 0) {
      return buildTree(tree, acc, ite + 1, processedPackages)
    } else {
      return acc
    }
  }
  const scan = (pathname, level = 0, acc = new Map()) => {
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

        const deps = Object.keys(pkgJson.dependencies || {}).filter((key) =>
          key.includes('@signalwire')
        )

        const pkgName = parsePackageName(pathname)

        if (deps.length === 0) {
          packagesWithNoDeps.add(pkgName)
        } else {
          acc.set(
            pkgName,
            deps.map((s) => {
              return parsePackageName(s)
            })
          )
        }
      } else {
        return scan(path.join(pathname, item), level + 1, acc)
      }
    })

    return acc
  }

  console.log('🌲 Constructing the build tree...')
  const pkgDeps = scan(path.join(__dirname, '../../packages'))
  const tree = buildTree(
    pkgDeps,
    new Map([[0, Array.from(packagesWithNoDeps)]])
  )
  console.log('🛠  Build order:', tree)

  for await (const packages of tree.values()) {
    const n = packages.map((pkg) => {
      return `npm run build -w=@signalwire/${pkg}`
    })

    try {
      console.log('🏃‍♂️ Running ->', n)
      await concurrently(n)
    } catch (e) {
      console.error('something went wrong')
    }
  }
}
