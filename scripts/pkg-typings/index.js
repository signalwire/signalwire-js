import fs from 'fs'
import path from 'path'

export function cli(args) {
  const flags = args[2]
  const filePath = path.resolve(process.cwd(), 'package.json')
  const pkgJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  switch (flags) {
    case '--pre-run': {
      pkgJson.types = ''

      fs.writeFileSync(filePath, JSON.stringify(pkgJson, null, 2))

      break
    }
    case '--after-run': {
      const projectName = pkgJson.name.split('/')[1]

      pkgJson.types = `dist/${projectName}/src/index.d.ts`

      fs.writeFileSync(filePath, JSON.stringify(pkgJson, null, 2) + '\n')

      break
    }
  }
}
