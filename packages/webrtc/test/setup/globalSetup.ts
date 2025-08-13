import { FullConfig } from '@playwright/test'
import { MockTurnServer, waitForServer } from '../turnServer'

/**
 * Global setup for Playwright tests
 * Starts the TURN server before running tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  try {
    const turnServer = MockTurnServer.getInstance()
    await turnServer.start()
    
    const turnConfig = turnServer.getConfig()
    const isReady = await waitForServer(turnConfig.host, turnConfig.port, 10000)
    
    if (!isReady) {
      throw new Error('TURN server failed to start within timeout')
    }
    
    console.log('✅ Global setup completed successfully')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

export default globalSetup