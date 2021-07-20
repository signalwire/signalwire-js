const esbuild = require('esbuild')
const { nodeExternalsPlugin } = require('esbuild-node-externals')

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    // minify: true,
    format: 'esm',
    target: 'es2017',
    sourcemap: true,
    plugins: [
      nodeExternalsPlugin({
        // dependencies: false,
        // devDependencies: false,
      }),
    ],
  })
  .catch(() => process.exit(1))
