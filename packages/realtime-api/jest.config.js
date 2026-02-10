module.exports = {
  moduleNameMapper: {
    // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
    uuid: require.resolve('uuid'),
  },
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
  setupFiles: ['./src/setupTests.ts'],
}
