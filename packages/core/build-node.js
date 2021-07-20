const esbuild = require('esbuild')
const { nodeExternalsPlugin } = require('esbuild-node-externals')

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    outfile: 'lib/index-node.js',
    bundle: true,
    // minify: true,
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
  })
  .catch(() => process.exit(1))
