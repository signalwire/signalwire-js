import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
// UMD related deps.
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import * as rollup from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import license from 'rollup-plugin-license'
import replace from '@rollup/plugin-replace'
import { visualizer } from 'rollup-plugin-visualizer'
import typescript from 'rollup-plugin-typescript2'
import swConfig from '../../sw.config.js'

const COMMON_NODE = {
  entryPoints: ['./src/index.ts'],
  minify: false,
  sourcemap: true,
  platform: 'node',
  target: 'node14',
  bundle: true,
  // TODO: we might want to expose an option to selectively define
  // what to bundle and what not
  plugins: [nodeExternalsPlugin()],
}

const COMMON_WEB = {
  entryPoints: ['./src/index.ts'],
  platform: 'neutral',
  minify: false,
  sourcemap: true,
  bundle: true,
  plugins: [nodeExternalsPlugin()],
}
const OPTIONS_MAP = {
  '--node': [
    {
      ...COMMON_NODE,
      format: 'cjs',
      target: 'es2015',
      outfile: 'dist/index.node.js',
    },
    {
      ...COMMON_NODE,
      format: 'esm',
      target: 'es2017',
      outfile: 'dist/index.node.mjs',
    },
  ],
  '--web': [
    {
      ...COMMON_WEB,
      format: 'cjs',
      target: 'es2015',
      outfile: 'dist/index.js',
    },
    {
      ...COMMON_WEB,
      format: 'esm',
      target: 'es2017',
      outfile: 'dist/index.esm.js',
    },
  ],
  '--umd': [
    {
      entryPoints: ['./src/index.ts'],
      outfile: 'dist/index.umd.js',
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2017',
      sourcemap: true,
      plugins: [
        nodeExternalsPlugin({
          // Bundle all deps under "dependencies"
          dependencies: false,
        }),
      ],
    },
  ],
  /**
   * All the esbuild options meant for `development` mode. This
   * options will be applied after all the others which means anything
   * here will overwrite other options.
   */
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
const BUILD_MODES = ['--web', '--node', '--umd']

const isBuildModeFlag = (flag) => {
  return BUILD_MODES.includes(flag)
}
const hasBuildModeFlag = (flags = []) => {
  return flags.some((flag) => isBuildModeFlag(flag))
}
const getBuildModeFlag = (flags = []) => {
  return flags.find((f) => isBuildModeFlag(f))
}
const isWatchFormatFlag = (flag) => {
  return flag.startsWith('--watchFormat')
}
const isDevMode = (flags = []) => {
  return flags.includes('--dev')
}
const isUmdMode = (flags = []) => {
  return flags.includes('--umd')
}
const getWatchFormatFlag = (flags) => {
  const flagWatchFormat = flags.find((f) => isWatchFormatFlag(f))
  if (!flagWatchFormat) {
    return 'esm'
  }

  return flagWatchFormat.split('=')[1]
}
const getPackageAgentName = (pkgJson) => {
  const pkgName = pkgJson.name
  const agentName = swConfig.agents.byName[pkgName]

  /**
   * Only private packages or utility packages are allowed
   * to not have an agent.
   */
  const requiresAgent =
    !pkgJson.private && !swConfig.utilityPackages.includes(pkgName)

  if (!requiresAgent) {
    return ''
  }

  /**
   * We'll break the build if we detect that a public
   * package doesn't have an agent name defined.
   */
  if (!agentName) {
    throw new Error(`[getPackageAgentName] Missing agent name for ${pkgName}`)
  }

  return `@signalwire/${agentName}/${pkgJson.version}`
}
const getBuildOptions = ({ flags, pkgJson }) => {
  const optionsFlags = flags.filter(
    (f) => !isBuildModeFlag(f) && !isWatchFormatFlag(f)
  )
  const modeFlag = getBuildModeFlag(flags)
  /**
   * When in dev mode, this flag will let us pick which format to
   * generate
   */
  const watchFormat = getWatchFormatFlag(flags)

  if (!modeFlag) {
    console.error('Missing mode flag (--web, --node or --umd)')
    process.exit(1)
  }

  const sdkEnvVariables = {
    'process.env.SDK_PKG_NAME': JSON.stringify(pkgJson.name),
    'process.env.SDK_PKG_DESCRIPTION': JSON.stringify(pkgJson.description),
  }
  const sdkPackageAgent = getPackageAgentName(pkgJson)
  if (sdkPackageAgent) {
    sdkEnvVariables['process.env.SDK_PKG_AGENT'] = JSON.stringify(
      getPackageAgentName(pkgJson)
    )
  }

  /**
   * Each mode (--web/--node/--umd) can have multiple outputs and
   * these options will be applied to each of them
   */
  const commonOptions = optionsFlags.reduce(
    (reducer, flag) => {
      const options = OPTIONS_MAP[flag]

      if (!options) {
        console.error('Invalid flag: ', flag)
        process.exit(1)
      }

      return mergeOptions(reducer, options)
    },
    {
      define: sdkEnvVariables,
    }
  )

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

    return [mergeOptions(activeMode, commonOptions)]
  }

  return OPTIONS_MAP[modeFlag].map((opt) => {
    return mergeOptions(opt, commonOptions)
  })
}
/**
 * `esbuild` doesn't support generating `umd` so we're using Rollup
 * just for this.
 */
const buildUmd = async (options) => {
  const outfile = path.join(options.outfile)
  const instance = await rollup.rollup({
    input: options.entryPoints,
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return
      warn(warning)
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs({
        browser: true,
      }),
      replace({
        ...options.define,
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true,
      }),
      typescript({
        tsconfig: path.resolve(process.cwd(), './tsconfig.build.json'),
        tsconfigOverride: {
          compilerOptions: {
            emitDeclarationOnly: false,
          },
        },
      }),
      license({
        banner: {
          content: `
          <%= pkg.description %> v<%= pkg.version %> (https://signalwire.com)
          Copyright 2018-<%= new Date().getFullYear() %> SignalWire
          Licensed under MIT(https://github.com/signalwire/signalwire-js/blob/main/LICENSE)`,
          commentStyle: 'ignored',
        },
      }),
      terser({
        compress: {
          keep_infinity: true,
          pure_getters: true,
          passes: 10,
        },
        format: {
          comments: /^\s*([@#]__[A-Z]__\s*$|@cc_on)/,
          preserve_annotations: true,
          // This setting respects the commentStyle: 'ignored'.
          comments: 'some',
        },
        mangle: true,
      }),
      visualizer(),
    ],
  })
  return instance.write({
    format: 'umd',
    name: 'SignalWire',
    file: outfile,
    sourcemap: true,
  })
}
const mergeOptions = (options, defaultOptions = {}) => {
  return {
    ...defaultOptions,
    ...options,
    define: {
      ...defaultOptions.define,
      ...options.define,
    },
  }
}

/**
 * utility for building all of our bundles (with the exception of UMD.
 * @see buildUmd for that)
 */
const build = async ({ options, setupFile }) => {
  return Promise.all(
    options.map((opt) => {
      // `esbuild` can't generate `umd` so we'll skip it here.
      if (opt.format === 'umd') {
        return Promise.resolve()
      }

      return esbuild.build({
        ...opt,
        ...setupFile,
      })
    })
  )
}

const getCleanFlagName = (flag) => flag.replace('--', '')

export async function cli(args) {
  const flags = args.slice(2)
  /**
   * This (optional) file gives us the option to overwrite some of our
   * default build settings. You can place everything that's accepted
   * by `esbuild` (that can be serializable since it's a JSON file).
   */
  const filePath = path.join(process.cwd(), 'build.config.json')
  const pkgJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
  )
  let setupFile = {}
  if (fs.existsSync(filePath)) {
    setupFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  if (!hasBuildModeFlag(flags) && !setupFile) {
    console.log(
      'You must specify a mode (--web, --node or --umd) and/or config file (build.config.json)'
    )
    process.exit(1)
  }
  const buildModeFlag = getBuildModeFlag(flags)
  const options = getBuildOptions({ flags, pkgJson })
  if (isDevMode(flags)) {
    console.log(
      `🟢 [${pkgJson.name}] Watch mode for ${getCleanFlagName(
        buildModeFlag
      )} enabled`
    )
  }
  try {
    const results = await build({ options, setupFile })
    if (isUmdMode(flags)) {
      await Promise.all(options.map((opt) => buildUmd(opt)))
    }
    // `result.stop` is defined only in watch mode.
    if (!results.some((result) => result.stop)) {
      console.log(`✅ [${pkgJson.name} | ${buildModeFlag}] Built successfully!`)
    }
  } catch (error) {
    console.log(`🔴 [${pkgJson.name}] Build failed.`, error)
    process.exit(1)
  }
}
