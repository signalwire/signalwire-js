import { defineConfig, loadEnv, type Plugin } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';
import pkg from './package.json';
import { storyScaffoldPlugin } from './scripts/story-scaffold-plugin';

function findStoryHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) findStoryHtml(full, out);
    else if (full.endsWith('.story.html')) out.push(full);
  }
  return out;
}

// Copy the pre-built embed IIFE bundle into the stories output at /embed/,
// so embed-style stories can load it with a plain <script> tag after deploy.
// Expects `vite build --config vite.embed.config.ts` to have run first.
function copyEmbedBundle(): Plugin {
  return {
    name: 'copy-embed-bundle',
    apply: 'build',
    writeBundle(options) {
      const src = resolve(__dirname, 'dist/embed');
      const dest = resolve(options.dir ?? 'dist-stories', 'embed');
      if (!existsSync(src)) {
        this.warn(
          '[copy-embed-bundle] dist/embed not found — run `vite build --config vite.embed.config.ts` before the stories build',
        );
        return;
      }
      mkdirSync(dest, { recursive: true });
      for (const file of readdirSync(src)) {
        copyFileSync(resolve(src, file), resolve(dest, file));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const storyFiles = findStoryHtml(resolve(__dirname, 'stories'));
  const input = [resolve(__dirname, 'index.html'), ...storyFiles];

  return {
    publicDir: false,
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [storyScaffoldPlugin(env), copyEmbedBundle()],
    build: {
      outDir: 'dist-stories',
      emptyOutDir: true,
      sourcemap: true,
      // Stories use top-level await; every modern target supports it.
      target: 'esnext',
      rollupOptions: {
        input,
        // `src/index.ts` is pure re-exports. Even with `moduleSideEffects:
        // true`, Rollup still strips the reassignments that apply
        // `@customElement('sw-foo')` decorators because it thinks the class
        // identifier is dead. Disable treeshaking so every component's
        // customElements.define() survives for the demo site.
        treeshake: false,
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});