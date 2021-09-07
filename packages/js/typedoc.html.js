module.exports = {
  out: './docs/html/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'none',
  tsconfig: 'tsconfig.docs.json',
  plugin: [ ]
}
