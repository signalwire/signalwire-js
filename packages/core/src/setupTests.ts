jest.mock('./utils', () => {
  return {
    ...jest.requireActual('./utils'),
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
