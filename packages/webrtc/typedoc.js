module.exports = {
  out: './docs/',
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludePrivate: true,
  hideGenerator: true,
  readme: 'none',
  tsconfig: 'tsconfig.docs.json'
}
