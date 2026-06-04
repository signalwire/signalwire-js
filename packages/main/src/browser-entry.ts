/**
 * Browser bundle entry point
 *
 * WARNING: This file should NEVER be imported by internal modules
 * Internal modules must import directly from source files
 *
 * This entry point:
 * 1. Polyfills Node.js globals for browser compatibility
 * 2. Re-exports all public APIs from the main package
 *
 * The polyfill is embedded directly in the code (not via banner)
 * to ensure it's always present regardless of how the bundle is loaded.
 */

// Polyfill Node.js process global for browser
// This is needed by src/utils/logger.ts which checks process.env.NODE_ENV
if (typeof process === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (globalThis as any).process = {
    env: {
      NODE_ENV: 'production'
    }
  };
}

// Note: crypto polyfill is handled via import map in the HTML
// See playwright_tests/test-page.html for the import map configuration

// Re-export everything from the main package
// This ensures the bundled version has the same API as the npm package
export * from './index';
