/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
  setupFiles: ['./src/test/setupTests.js'],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
}