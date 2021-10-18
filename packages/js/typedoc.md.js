module.exports = {
  out: './docs/md/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludeProtected: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'none',
  tsconfig: 'tsconfig.docs.json',
  plugin: ['@signalwire/typedoc-readme-api-theme'],
  pageSlugPrefix: 'js-',
  entryDocument: 'js-exports.md',
  entryTitle: 'JavaScript SDK'
}
