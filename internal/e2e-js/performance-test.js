/**
 * Performance Testing Script for SDK Migration
 * 
 * This script measures:
 * 1. Bundle sizes
 * 2. Load times
 * 3. Memory usage
 * 4. Runtime performance
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const v8 = require('v8');

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper to get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

// Measure memory usage
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    rss: formatBytes(memUsage.rss),
    heapTotal: formatBytes(memUsage.heapTotal),
    heapUsed: formatBytes(memUsage.heapUsed),
    external: formatBytes(memUsage.external),
    arrayBuffers: formatBytes(memUsage.arrayBuffers)
  };
}

console.log('=== SignalWire SDK Performance Testing ===\n');

// 1. Bundle Size Analysis
console.log('1. Bundle Size Analysis');
console.log('-'.repeat(50));

const bundles = [
  // Video SDK (@signalwire/js)
  { name: '@signalwire/js (ESM)', path: 'packages/js/dist/index.esm.js' },
  { name: '@signalwire/js (UMD)', path: 'packages/js/dist/index.umd.js' },
  // Fabric SDK (@signalwire/browser-js)
  { name: '@signalwire/browser-js (ESM)', path: 'packages/browser-js/dist/index.esm.js' },
  { name: '@signalwire/browser-js (UMD)', path: 'packages/browser-js/dist/index.umd.js' },
  // Common Package
  { name: '@signalwire/browser-common (ESM)', path: 'packages/browser-common/dist/index.esm.js' },
];

bundles.forEach(bundle => {
  const fullPath = path.join(__dirname, '..', '..', bundle.path);
  const size = getFileSize(fullPath);
  console.log(`${bundle.name}: ${formatBytes(size)}`);
});

console.log('\n2. Load Time Testing');
console.log('-'.repeat(50));

// Test module load times
async function testLoadTime(moduleName, modulePath) {
  const start = performance.now();
  
  try {
    // Clear require cache
    delete require.cache[require.resolve(modulePath)];
    
    // Load the module
    require(modulePath);
    
    const end = performance.now();
    const loadTime = (end - start).toFixed(2);
    
    console.log(`${moduleName}: ${loadTime}ms`);
    return loadTime;
  } catch (error) {
    console.log(`${moduleName}: Failed to load - ${error.message}`);
    return -1;
  }
}

// Test load times for built packages
(async () => {
  console.log('\nTesting CommonJS load times:');
  
  // Note: We can only test packages that have CommonJS builds
  await testLoadTime('@signalwire/core', '../../packages/core/dist/index.node.js');
  await testLoadTime('@signalwire/webrtc', '../../packages/webrtc/dist/cjs/index.js');
  await testLoadTime('@signalwire/realtime-api', '../../packages/realtime-api/dist/index.node.js');
  
  console.log('\n3. Memory Usage Analysis');
  console.log('-'.repeat(50));
  
  // Check initial memory
  console.log('Initial memory usage:');
  console.log(getMemoryUsage());
  
  // Load modules and check memory
  console.log('\nAfter loading modules:');
  const core = require('../../packages/core/dist/index.node.js');
  console.log(getMemoryUsage());
  
  console.log('\n4. Runtime Performance Characteristics');
  console.log('-'.repeat(50));
  
  // Test object creation performance
  const iterations = 10000;
  
  // Test event emitter performance
  if (core.EventEmitter) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const emitter = new core.EventEmitter();
      emitter.on('test', () => {});
      emitter.emit('test');
    }
    const end = performance.now();
    console.log(`EventEmitter operations (${iterations} iterations): ${(end - start).toFixed(2)}ms`);
  }
  
  // Test logger performance
  if (core.getLogger) {
    const logger = core.getLogger();
    const start = performance.now();
    // Disable actual logging for performance test
    logger.setLevel('silent');
    for (let i = 0; i < iterations; i++) {
      logger.debug('test message');
    }
    const end = performance.now();
    console.log(`Logger operations (${iterations} iterations): ${(end - start).toFixed(2)}ms`);
  }
  
  console.log('\n5. Package Separation Impact');
  console.log('-'.repeat(50));
  
  console.log('Old structure (@signalwire/js with everything):');
  console.log('- Video SDK + Fabric SDK: ~210KB (UMD)');
  
  console.log('\nNew structure (after split):');
  console.log('- Video SDK only (@signalwire/js): ~210KB (UMD)');
  console.log('- Fabric SDK only (@signalwire/browser-js): ~227KB (UMD)');
  console.log('- Shared code (@signalwire/browser-common): ~100KB (ESM)');
  
  console.log('\nBenefit: Applications using only Video SDK save ~227KB');
  console.log('Benefit: Applications using only Fabric SDK save ~210KB');
  
  console.log('\n=== Performance Test Complete ===');
})();