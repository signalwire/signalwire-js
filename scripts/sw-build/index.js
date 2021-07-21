import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

// TODO: review options for --node and --web
const OPTIONS_MAP = {
  '--node': {
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index-node.js',
    bundle: true,
    minify: true,
    format: 'cjs',
    target: 'es2017',
    sourcemap: true,
    platform: 'node',
    target: 'node14',
    plugins: [
      nodeExternalsPlugin({
        dependencies: false,
        devDependencies: false,
      }),
    ],
  },
  '--web': {
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2017',
    sourcemap: true,
    plugins: [
      nodeExternalsPlugin({
        // dependencies: false,
        // devDependencies: false,
      }),
    ],
  },
  '--dev': {
    minify: false,
    watch: {
      onRebuild(error, result) {
        if (error) console.error('watch build failed:', error)
        else console.log('watch build succeeded')
      },
    },
  },
}
const BUILD_MODES = ['--web', '--node']

const isFlagMode = (flag) => {
  return BUILD_MODES.includes(flag)
}

const hasFlagMode = (flags = []) => {
  return flags.some((flag) => isFlagMode(flag))
}
const isDevMode = (flags = []) => {
  return flags.includes('--dev')
}

const getOptionsFromFlags = (flags) => {
  return flags.reduce((reducer, flag) => {
    const options = OPTIONS_MAP[flag]

    if (!options) {
      console.error('Invalid flag: ', flag)
      process.exit(1)
    }

    return {
      ...reducer,
      ...options,
    }
  }, {})
}

export function cli(args) {
  const flags = args.slice(2)
  const filePath = path.join(process.cwd(), 'build.config.json')
  const pkgJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
  )

  let setupFile = {}
  if (fs.existsSync(filePath)) {
    setupFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }

  if (!hasFlagMode(flags) && !setupFile) {
    console.log(
      'You must specify a mode (--web or --node) and/or config file (build.config.json)'
    )
    process.exit(1)
  }

  if (isDevMode(flags)) {
    console.log('🟢 Watch mode enabled.')
  }

  const options = getOptionsFromFlags(flags)

  esbuild
    .build({
      ...options,
      ...setupFile,
    })
    .then((result) => {
      // `result.stop` is defined only in watch mode.
      if (!result.stop) {
        console.log(`✅ [${pkgJson.name}] Built successfully!`)
      }
    })
    .catch((error) => {
      console.log(`🔴 [${pkgJson.name}] Build failed.`, error)
      process.exit(1)
    })
}
