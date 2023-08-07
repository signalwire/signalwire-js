import { WebAPI } from './index'

describe('WebAPI', () => {
  it('should expose validat', () => {
    expect(WebAPI.validateRequest).toBeDefined()
    expect(typeof WebAPI.validateRequest).toBe('function')
  })
})
