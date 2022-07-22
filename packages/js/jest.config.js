/** @type {import('@jest/types').Config.InitialOptions} */
const commonConfig = {
  resolver: '<rootDir>/test/resolver.js',
  setupFiles: ['./src/setupTests.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
}

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  projects: [
    {
      ...commonConfig,
      displayName: 'stable',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
    },
    {
      ...commonConfig,
      displayName: 'experimental',
      testMatch: ['<rootDir>/src/**/*.exp-test.ts'],
    },
  ],
}
