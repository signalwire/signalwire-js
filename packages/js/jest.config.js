module.exports = {
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './../../babel.config.js' }],
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/uuid',
  ],
  setupFiles: ['./src/setupTests.ts'],
}
