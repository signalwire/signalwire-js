/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
  resolver: '<rootDir>/test/resolver.js',
  setupFiles: ['./src/setupTests.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
}
