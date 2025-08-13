const { MockTurnServer, waitForServer } = require('../turnServer');

/**
 * Global setup for Playwright tests
 * Starts the TURN server before running tests
 */
async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Skip global setup since webServer handles it
    console.log('✅ Global setup completed successfully (using webServer)');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;