#!/usr/bin/env node

/**
 * Build script for creating integration test bundles
 * 
 * This script uses esbuild to bundle RTCPeerCore.ts for browser use with minimal mocks
 * for @signalwire/core dependencies, creating a completely standalone bundle.
 */

const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

// Minimal mocks for @signalwire/core dependencies
const mocks = {
  '@signalwire/core': `
    // Minimal logger implementation
    export const getLogger = () => ({
      debug: (...args) => console.debug('[RTCPeer]', ...args),
      info: (...args) => console.info('[RTCPeer]', ...args),
      warn: (...args) => console.warn('[RTCPeer]', ...args),
      error: (...args) => console.error('[RTCPeer]', ...args),
      trace: (...args) => console.trace('[RTCPeer]', ...args),
    });

    // Simple UUID generator (not crypto-secure, fine for tests)
    export const uuid = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Simple timeout promise implementation
    export const timeoutPromise = (ms, promise) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(\`Operation timed out after \${ms}ms\`));
        }, ms);
        
        promise
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeoutId));
      });
    };

    // Simple EventEmitter implementation
    export class EventEmitter {
      constructor() {
        this.events = {};
      }
      
      on(event, listener) {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
      }
      
      off(event, listener) {
        if (!this.events[event]) return this;
        this.events[event] = this.events[event].filter(l => l !== listener);
        return this;
      }
      
      emit(event, ...args) {
        if (!this.events[event]) return false;
        this.events[event].forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error('EventEmitter error:', error);
          }
        });
        return true;
      }
      
      removeAllListeners(event) {
        if (event) {
          delete this.events[event];
        } else {
          this.events = {};
        }
        return this;
      }
    }

    // Type definitions that might be needed
    export const VideoPositions = {};
  `
}

async function buildIntegrationBundle() {
  console.log('Building integration test bundle...')

  const srcDir = path.join(__dirname, '..', 'src')
  const distDir = path.join(__dirname, '..', 'dist', 'integration')
  
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  try {
    await esbuild.build({
      entryPoints: [path.join(srcDir, 'integration-bundle.ts')],
      bundle: true,
      outfile: path.join(distDir, 'rtc-peer-bundle.js'),
      format: 'iife',
      globalName: 'RTCPeerIntegration',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      minify: false, // Keep unminified for easier debugging
      plugins: [
        {
          name: 'mock-signalwire-core',
          setup(build) {
            // Mock @signalwire/core with our minimal implementations
            build.onResolve({ filter: /^@signalwire\/core$/ }, () => ({
              path: 'mock:@signalwire/core',
              namespace: 'mock'
            }))

            build.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => {
              if (args.path === 'mock:@signalwire/core') {
                return {
                  contents: mocks['@signalwire/core'],
                  loader: 'js'
                }
              }
            })
          }
        }
      ],
      define: {
        'process.env.NODE_ENV': '"test"',
      }
    })
    
    console.log('✅ Integration bundle built successfully!')
    console.log(`📦 Output: ${path.join(distDir, 'rtc-peer-bundle.js')}`)
    
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

// Create the integration bundle entry point if it doesn't exist
async function createEntryPoint() {
  const entryPath = path.join(__dirname, '..', 'src', 'integration-bundle.ts')
  
  if (fs.existsSync(entryPath)) {
    console.log('Entry point already exists, skipping creation...')
    return
  }

  console.log('Creating integration bundle entry point...')
  
  const entryContent = `
/**
 * Integration test bundle entry point
 * 
 * This file exports a factory function that tests can use to create
 * RTCPeerCore instances with the real implementation.
 */

import RTCPeerCore, { type RTCPeerDependencies, type RTCPeerLogger, type RTCPeerCallContract } from './RTCPeerCore'
import { getLogger, uuid } from '@signalwire/core'

// Export the RTCPeerCore class and its types
export { RTCPeerCore }
export type { RTCPeerDependencies, RTCPeerLogger, RTCPeerCallContract }

// Create a factory function that tests can use
export const createRTCPeerCore = <EventTypes = any>(
  call: RTCPeerCallContract<EventTypes>,
  type: RTCSdpType,
  customDependencies?: Partial<RTCPeerDependencies>
): RTCPeerCore<EventTypes> => {
  const dependencies: RTCPeerDependencies = {
    logger: getLogger(),
    uuidGenerator: uuid,
    ...customDependencies
  }
  
  return new RTCPeerCore(call, type, dependencies)
}

// Also export individual utilities that tests might need
export * from './utils'
export { connectionPoolManager } from './connectionPoolManager'

// Make it available globally for browser tests
if (typeof window !== 'undefined') {
  (window as any).RTCPeerIntegration = {
    createRTCPeerCore,
    RTCPeerCore
  }
}
`
  
  fs.writeFileSync(entryPath, entryContent.trim())
  console.log('✅ Entry point created!')
}

if (require.main === module) {
  (async () => {
    try {
      await createEntryPoint()
      await buildIntegrationBundle()
    } catch (error) {
      console.error('Build process failed:', error)
      process.exit(1)
    }
  })()
}

module.exports = { buildIntegrationBundle, createEntryPoint }