module.exports = {
  out: './docs/md/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludeProtected: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'README.md',
  tsconfig: 'tsconfig.docs.json',
  pageSlugPrefix: 'js-',
  plugin: ['@signalwire/typedoc-readme-api-theme'],
}
