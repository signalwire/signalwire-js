module.exports = {
  out: './docs/html/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludeProtected: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'README.md',
  tsconfig: 'tsconfig.docs.json',
  plugin: [],
}
