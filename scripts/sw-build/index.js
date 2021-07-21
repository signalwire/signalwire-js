import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

const COMMON_NODE = {
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node14',
  // TODO: we might want to expose an option to selectively define
  // what to bundle and what not
  plugins: [nodeExternalsPlugin()],
}
// TODO: review options for --node and --web
const OPTIONS_MAP = {
  '--node': [
    {
      ...COMMON_NODE,
      format: 'cjs',
      target: 'es2015',
      outfile: 'dist/index-node.js',
    },
    {
      ...COMMON_NODE,
      format: 'esm',
      target: 'es2017',
      outfile: 'dist/index-node.mjs',
    },
  ],
  '--web': [
    {
      entryPoints: ['./src/index.ts'],
      outfile: 'dist/index.js',
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2017',
      sourcemap: true,
      plugins: [nodeExternalsPlugin()],
    },
  ],
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
// TODO: add --umd
const BUILD_MODES = ['--web', '--node']

const isFlagMode = (flag) => {
  return BUILD_MODES.includes(flag)
}
const hasFlagMode = (flags = []) => {
  return flags.some((flag) => isFlagMode(flag))
}
const getFlagMode = (flags = []) => {
  return flags.find((f) => isFlagMode(f))
}
const isFlagWatchFormat = (flag) => {
  return flag.startsWith('--watchFormat')
}
const isDevMode = (flags = []) => {
  return flags.includes('--dev')
}
const getWatchFormat = (flags) => {
  const flagWatchFormat = flags.find((f) => isFlagWatchFormat(f))
  if (!flagWatchFormat) {
    return 'esm'
  }

  return flagWatchFormat.split('=')[1]
}
const getOptionsFromFlags = (flags) => {
  const optionsFlags = flags.filter(
    (f) => !isFlagMode(f) && !isFlagWatchFormat(f)
  )
  const modeFlag = getFlagMode(flags)
  /**
   * When in dev mode, this flag will let us pick which format to
   * generate
   */
  const watchFormat = getWatchFormat(flags)

  if (!modeFlag) {
    console.error('Missing mode flag (--web or --node)')
    process.exit(1)
  }

  /**
   * Each mode (--web/--node) can have multiple outputs and these
   * options will be applied to each of them
   */
  const commonOptions = optionsFlags.reduce((reducer, flag) => {
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

  const modeOptions = OPTIONS_MAP[modeFlag]

  /**
   * If we're in dev mode and the current `mode` has multiple outputs
   * we'll have to pick one. By default we'll favour `esm` and give
   * the user a change to overwrite this from the command line.
   */
  if (isDevMode(flags) && modeOptions.length > 1) {
    const activeMode = modeOptions.find((opt) => opt.format === watchFormat)

    if (!activeMode) {
      console.error('Invalid `watchFormat` flag', watchFormat)
      process.exit(1)
    } else {
      console.log(
        `⚙️  Watch mode will be generating the format: ${watchFormat}`
      )
    }

    return [
      {
        ...activeMode,
        ...commonOptions,
      },
    ]
  }

  return OPTIONS_MAP[modeFlag].map((opt) => {
    return {
      ...opt,
      ...commonOptions,
    }
  })
}

export async function cli(args) {
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

  const modeFlag = getFlagMode(flags)
  const options = getOptionsFromFlags(flags)

  try {
    const [result] = await Promise.all(
      options.map((opt) =>
        esbuild.build({
          ...opt,
          ...setupFile,
        })
      )
    )

    // `result.stop` is defined only in watch mode.
    if (!result.stop) {
      console.log(`✅ [${pkgJson.name} | ${modeFlag}] Built successfully!`)
    }
  } catch (error) {
    console.log(`🔴 [${pkgJson.name}] Build failed.`, error)
    process.exit(1)
  }
}
