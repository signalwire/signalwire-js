import * as BrowserJS from './index'
import { SignalWire, CallSession, CallSessionMember, WSClient, HTTPClient, Conversation, WebRTC } from './index'

describe('@signalwire/browser-js exports', () => {
  it('should export SignalWire', () => {
    expect(BrowserJS.SignalWire).toBeDefined()
    expect(SignalWire).toBeDefined()
    expect(typeof SignalWire).toBe('function')
  })

  it('should export WebRTC namespace', () => {
    expect(BrowserJS.WebRTC).toBeDefined()
    expect(WebRTC).toBeDefined()
    expect(typeof WebRTC).toBe('object')
  })

  it('should export core Call Fabric components', () => {
    expect(BrowserJS.CallSession).toBeDefined()
    expect(CallSession).toBeDefined()
    expect(typeof CallSession).toBe('function')

    expect(BrowserJS.CallSessionMember).toBeDefined()
    expect(CallSessionMember).toBeDefined()
    expect(typeof CallSessionMember).toBe('function')

    expect(BrowserJS.WSClient).toBeDefined()
    expect(WSClient).toBeDefined()
    expect(typeof WSClient).toBe('function')

    expect(BrowserJS.HTTPClient).toBeDefined()
    expect(HTTPClient).toBeDefined()
    expect(typeof HTTPClient).toBe('function')

    expect(BrowserJS.Conversation).toBeDefined()
    expect(Conversation).toBeDefined()
    expect(typeof Conversation).toBe('function')
  })

  it('should export default SignalWire', () => {
    expect(BrowserJS.default).toBeDefined()
    expect(BrowserJS.default).toBe(SignalWire)
  })

  it('should have all required exports for Call Fabric SDK', () => {
    const expectedExports = [
      'SignalWire',
      'WebRTC', 
      'CallSession',
      'CallSessionMember',
      'WSClient',
      'HTTPClient', 
      'Conversation',
      'default'
    ]

    expectedExports.forEach(exportName => {
      expect(BrowserJS).toHaveProperty(exportName)
    })
  })
})