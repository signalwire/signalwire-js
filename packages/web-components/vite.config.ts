import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';
import { storyScaffoldPlugin } from './scripts/story-scaffold-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    publicDir: false,
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [storyScaffoldPlugin(env)],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
      },
      rollupOptions: {
        external: [/^lit/, /^@lit\//, /^rxjs/, '@signalwire/js'],
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});