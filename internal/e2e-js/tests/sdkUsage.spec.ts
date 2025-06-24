import { test, expect } from '../fixtures'
import { SERVER_URL } from '../utils'

test.describe('SDK Usage', () => {
  test('should be able to instantiate Video SDK components', async ({ page }) => {
    await page.goto(SERVER_URL)
    
    const result = await page.evaluate(() => {
      try {
        // Test Video SDK components
        const Video = window._SWJS.Video
        const Chat = window._SWJS.Chat
        const PubSub = window._SWJS.PubSub
        const WebRTC = window._SWJS.WebRTC
        
        // Check if constructors are available
        const hasVideoRoomSession = typeof Video.RoomSession === 'function'
        const hasChatClient = typeof Chat.Client === 'function'
        const hasPubSubClient = typeof PubSub.Client === 'function'
        const hasWebRTCMethods = typeof WebRTC.getUserMedia === 'function'
        
        // Try creating instances (without connecting)
        let canCreateVideoSession = false
        let canCreateChatClient = false
        let canCreatePubSubClient = false
        
        try {
          // Note: We can't actually connect without valid tokens
          // Just testing instantiation
          const videoSession = new Video.RoomSession({
            token: 'dummy-token',
            rootElement: document.createElement('div')
          })
          canCreateVideoSession = !!videoSession
        } catch (e) {
          console.error('Video session error:', e)
        }
        
        try {
          const chatClient = new Chat.Client({
            token: 'dummy-token'
          })
          canCreateChatClient = !!chatClient
        } catch (e) {
          console.error('Chat client error:', e)
        }
        
        try {
          const pubSubClient = new PubSub.Client({
            token: 'dummy-token'
          })
          canCreatePubSubClient = !!pubSubClient
        } catch (e) {
          console.error('PubSub client error:', e)
        }
        
        return {
          hasVideoRoomSession,
          hasChatClient,
          hasPubSubClient,
          hasWebRTCMethods,
          canCreateVideoSession,
          canCreateChatClient,
          canCreatePubSubClient
        }
      } catch (error) {
        return {
          error: error.message,
          stack: error.stack
        }
      }
    })
    
    console.log('Video SDK test result:', result)
    
    if ('error' in result) {
      throw new Error(`Video SDK error: ${result.error}\n${result.stack}`)
    }
    
    expect(result.hasVideoRoomSession).toBe(true)
    expect(result.hasChatClient).toBe(true)
    expect(result.hasPubSubClient).toBe(true)
    expect(result.hasWebRTCMethods).toBe(true)
    expect(result.canCreateVideoSession).toBe(true)
    expect(result.canCreateChatClient).toBe(true)
    expect(result.canCreatePubSubClient).toBe(true)
  })
  
  test('should be able to instantiate Fabric SDK components', async ({ page }) => {
    await page.goto(SERVER_URL)
    
    const result = await page.evaluate(async () => {
      try {
        // Test Fabric SDK components
        const SignalWire = window._SWBROWSERJS.SignalWire
        
        // Check if SignalWire is available
        const hasSignalWire = typeof SignalWire === 'function'
        
        // Try creating instance (without connecting)
        let canCreateClient = false
        let clientError = null
        
        try {
          // SignalWire is an async function, not a constructor with 'new'
          // It will fail with invalid token but we just want to test if it's callable
          const clientPromise = SignalWire({
            token: 'dummy-token'
          })
          // Check if it returns a promise
          canCreateClient = clientPromise && typeof clientPromise.then === 'function'
        } catch (e) {
          console.error('SignalWire client error:', e)
          clientError = e.message
        }
        
        return {
          hasSignalWire,
          canCreateClient,
          clientError
        }
      } catch (error) {
        return {
          error: error.message,
          stack: error.stack
        }
      }
    })
    
    console.log('Fabric SDK test result:', result)
    
    if ('error' in result) {
      throw new Error(`Fabric SDK error: ${result.error}\n${result.stack}`)
    }
    
    expect(result.hasSignalWire).toBe(true)
    // SignalWire function should be callable and return a promise
    expect(result.canCreateClient).toBe(true)
  })
  
  test('should show deprecation warnings for old exports', async ({ page }) => {
    await page.goto(SERVER_URL)
    
    const warnings: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text())
      }
    })
    
    const result = await page.evaluate(() => {
      try {
        // Try to access deprecated exports
        let fabricError = null
        let signalWireError = null
        
        try {
          // @ts-ignore
          window._SWJS.Fabric.SignalWire
        } catch (e) {
          fabricError = e.message
        }
        
        try {
          // @ts-ignore
          window._SWJS.SignalWire()
        } catch (e) {
          signalWireError = e.message
        }
        
        return {
          fabricError,
          signalWireError
        }
      } catch (error) {
        return {
          error: error.message
        }
      }
    })
    
    console.log('Deprecation test result:', result)
    console.log('Warnings:', warnings)
    
    // Should have deprecation warnings
    expect(warnings.some(w => w.includes('DEPRECATION WARNING'))).toBe(true)
    
    // Should throw errors
    expect(result.fabricError).toContain('moved to @signalwire/browser-js')
    expect(result.signalWireError).toContain('moved to @signalwire/browser-js')
  })
})