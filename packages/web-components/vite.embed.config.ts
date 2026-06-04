import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  // Never copy public dir or story files into the embed bundle output.
  publicDir: false,
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      formats: ['iife', 'umd'],
      // Global variable name for the IIFE build: window.SignalWireUI
      name: 'SignalWireUI',
      fileName: 'signalwire-web-components-embed'
    },
    rollupOptions: {
      // Bundle everything — no externals for script-tag usage
      external: [],
      treeshake: {
        moduleSideEffects: true
      }
    },
    outDir: 'dist/embed',
    emptyOutDir: true,
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});