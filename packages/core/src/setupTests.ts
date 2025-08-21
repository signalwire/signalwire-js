// Mock storage functions to avoid circular dependency during tests
jest.mock('./utils/storage', () => ({
  ...jest.requireActual('./types/SignalwireStorageContract'),
  setGlobalStorageInstance: jest.fn(),
  getGlobalStorageInstance: jest.fn(() => null),
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  localStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
  sessionStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('./utils', () => {
  const actualUtils = jest.requireActual('./utils')
  return {
    ...actualUtils,
    logger: {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      levels: jest.fn(),
      setLevel: jest.fn(),
    },
  }
})
