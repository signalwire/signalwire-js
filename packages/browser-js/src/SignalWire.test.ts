import { SignalWire } from './SignalWire'

// Mock the dependencies
jest.mock('./HTTPClient')
jest.mock('./WSClient')
jest.mock('./Conversation')

describe('SignalWire', () => {
  const mockParams = {
    host: 'mock-host',
    project: 'mock-project',
    token: 'mock-token',
  }

  it('should be a function', () => {
    expect(typeof SignalWire).toBe('function')
  })

  it('should have proper structure', () => {
    expect(SignalWire).toBeDefined()
    expect(typeof SignalWire).toBe('function')
  })

  // Basic smoke test to ensure the module loads correctly
  it('should export SignalWire without errors', () => {
    expect(() => {
      // Just importing and checking the function exists
      const client = SignalWire
      expect(client).toBeDefined()
    }).not.toThrow()
  })
})