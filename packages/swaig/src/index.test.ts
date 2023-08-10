import * as SDK from './index'

describe('SWAIG SDK', () => {
  it('should export a SWAIG function', () => {
    expect(SDK.SWAIG).toBeDefined()
    expect(typeof SDK.SWAIG).toBe('function')
  })
})
