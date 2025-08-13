const { MockTurnServer } = require('../turnServer');

/**
 * Global teardown for Playwright tests
 * Stops the TURN server after all tests complete
 */
async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    const turnServer = MockTurnServer.getInstance();
    if (turnServer) {
      await turnServer.stop();
    }
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

module.exports = globalTeardown;