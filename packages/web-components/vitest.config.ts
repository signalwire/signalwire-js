import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  // Mirrors vite.config.ts. src/index.ts reads __VERSION__ at module load, so
  // without this the module cannot be imported under test at all.
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'happy-dom',
    // Unit tests must not hit the network. Injecting a stylesheet <link>
    // (e.g. Google Fonts) otherwise makes happy-dom fetch the real file.
    environmentOptions: {
      happyDOM: {
        settings: { disableCSSFileLoading: true },
      },
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**/*'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        // Ambient declarations carry no runtime — nothing to execute.
        'src/**/*.d.ts',
        'src/context/types.ts',
        // Pure re-export barrels, listed one by one rather than by glob.
        // src/index.ts is deliberately absent: it calls emitReadyEvent() at
        // module load, which is documented public behaviour. src/types/index.ts
        // is absent too — it still holds two unused runtime helpers, and hiding
        // them would make the dead code invisible.
        'src/components/sw-device-selector/index.ts',
        'src/components/UI/icons/index.ts',
        'src/components/UI/index.ts',
        'src/context/index.ts',
        'src/utils/index.ts',
        // Bundle/dev entry points, not shipped logic.
        'src/embed.ts',
        'src/dev/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
