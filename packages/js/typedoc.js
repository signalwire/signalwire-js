module.exports = {
  out: './docs/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'none',
  tsconfig: 'tsconfig.docs.json',
  pageSlugPrefix: 'js-',
  plugin: ['@signalwire/typedoc-readme-api-theme']
}
