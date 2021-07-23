module.exports = {
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  setupFiles: ['./src/setupTests.ts'],
}
