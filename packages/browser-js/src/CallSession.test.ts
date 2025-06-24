import { CallSession } from './CallSession'

describe('CallSession', () => {
  it('should be defined', () => {
    expect(CallSession).toBeDefined()
  })

  it('should be a factory function', () => {
    expect(typeof CallSession).toBe('function')
  })

  // Basic smoke test to ensure the factory function loads correctly
  it('should export CallSession without errors', () => {
    expect(() => {
      const SessionFactory = CallSession
      expect(SessionFactory).toBeDefined()
    }).not.toThrow()
  })
})