import { defineConfig } from 'tsdown';
import pkg from './package.json' with { type: 'json' };

/**
 * Bundled browser distribution configuration
 *
 * Creates self-contained browser bundles that include:
 * - All source code from src/
 * - All dependencies (RxJS, loglevel, etc.) bundled
 * - Node.js polyfills for browser compatibility
 * - Optimized and tree-shaken code
 *
 * Outputs:
 * - dist/browser.mjs - ES module bundle (for import statements)
 * - dist/bundle.umd.js - UMD bundle (for script tags and CDN)
 *
 * Use cases:
 * - CDN distribution (UMD)
 * - Direct browser usage without build tools (UMD)
 * - ES module imports in browsers (ESM)
 * - Playwright/browser integration tests (ESM)
 */
export default defineConfig({
  entry: {
    browser: 'src/browser-entry.ts', // Entry point with embedded polyfill, output as 'browser.*'
  },
  format: ['esm', 'umd'], // Both ES modules and UMD
  outDir: 'dist',
  clean: false, // Don't clean dist/ (main build already there)
  dts: false, // Type declarations from main build
  splitting: false, // Single bundle file
  sourcemap: true, // Enable sourcemaps for debugging
  minify: process.env.NODE_ENV === 'production', // Minify in production
  treeshake: true, // Remove unused code

  // Bundle ALL dependencies (RxJS, loglevel, etc.)
  // BUT keep crypto modules external (they'll be handled by import maps in HTML)
  noExternal: [/^(?!crypto$)(?!node:crypto$).*/], // Bundle everything except crypto modules

  // UMD-specific: Global name for window.SignalWire
  globalName: 'SignalWire',

  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },

  esbuildOptions(options) {
    options.target = 'es2020'; // Modern browser target
    options.platform = 'browser'; // Optimize for browser environment
    options.bundle = true; // Ensure bundling is enabled

    // Replace Node.js global references
    options.define = {
      global: 'globalThis',
    };

    // Prefer browser-specific package versions
    options.conditions = ['browser', 'module', 'import'];
  },
});
