import { test, expect } from '../fixtures'
import { SERVER_URL } from '../utils'

test.describe('SDK Infrastructure', () => {
  test('should load both Video SDK and Fabric SDK', async ({ page }) => {
    // Enable console logs BEFORE navigating
    page.on('console', msg => console.log('Page log:', msg.text()))
    page.on('pageerror', error => console.log('Page error:', error))
    
    await page.goto(SERVER_URL)
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check what HTML is loaded
    const pageContent = await page.content()
    console.log('Page HTML includes script?', pageContent.includes('index.js'))
    
    // Check for any errors first
    const pageErrors = await page.evaluate(() => {
      return window.lastError || null
    })
    
    if (pageErrors) {
      console.log('Page errors:', pageErrors)
    }
    
    // Test that both SDKs are loaded
    const result = await page.evaluate(() => {
      console.log('window object keys:', Object.keys(window))
      console.log('window._SWJS:', window._SWJS)
      console.log('window._SWBROWSERJS:', window._SWBROWSERJS)
      
      return {
        hasVideoSDK: typeof window._SWJS !== 'undefined',
        hasFabricSDK: typeof window._SWBROWSERJS !== 'undefined',
        // Check specific exports
        hasVideo: typeof window._SWJS?.Video !== 'undefined',
        hasChat: typeof window._SWJS?.Chat !== 'undefined',
        hasPubSub: typeof window._SWJS?.PubSub !== 'undefined',
        hasSignalWire: typeof window._SWBROWSERJS?.SignalWire !== 'undefined',
        windowKeys: Object.keys(window).filter(k => k.includes('SW'))
      }
    })
    
    console.log('Test result:', result)
    
    expect(result.hasVideoSDK).toBe(true)
    expect(result.hasFabricSDK).toBe(true)
    expect(result.hasVideo).toBe(true)
    expect(result.hasChat).toBe(true)
    expect(result.hasPubSub).toBe(true)
    expect(result.hasSignalWire).toBe(true)
  })
})