import { CallSessionMember } from './CallSessionMember'

describe('CallSessionMember', () => {
  it('should be defined', () => {
    expect(CallSessionMember).toBeDefined()
  })

  it('should be a factory function', () => {
    expect(typeof CallSessionMember).toBe('function')
  })

  // Basic smoke test to ensure the factory function loads correctly
  it('should export CallSessionMember without errors', () => {
    expect(() => {
      const MemberFactory = CallSessionMember
      expect(MemberFactory).toBeDefined()
    }).not.toThrow()
  })
})