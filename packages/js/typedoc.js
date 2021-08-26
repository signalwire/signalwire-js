module.exports = {
  out: './docs/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'none',
  tsconfig: 'tsconfig.docs.json',
  theme: '../../node_modules/@signalwire/typedoc-readme-api-theme/dist',
  plugin: ['typedoc-plugin-markdown']
}
