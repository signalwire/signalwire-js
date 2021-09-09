module.exports = {
  out: './docs/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'README.md',
  tsconfig: 'tsconfig.docs.json',
  plugin: [],
}
