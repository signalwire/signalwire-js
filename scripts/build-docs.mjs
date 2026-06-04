#!/usr/bin/env node
/**
 * Generates developer documentation into ./dev-docs/:
 *
 *   dev-docs/main/             - TypeDoc HTML for @signalwire/js
 *   dev-docs/main-md/          - TypeDoc Markdown for @signalwire/js (per-method files, Fern-ready)
 *   dev-docs/web-components/   - TypeDoc HTML for @signalwire/web-components
 *   dev-docs/web-components-md/ - TypeDoc Markdown for @signalwire/web-components (per-method files, Fern-ready)
 *   dev-docs/web-components-cem/ - Custom Elements Manifest for web components
 *   dev-docs/guides/           - Hand-written docs copied from ./docs
 *
 * Markdown structure :
 *   classes/
 *     SignalWire.md            ← class overview page
 *     SignalWire/
 *       connect.md             ← individual method page
 *       disconnect.md
 *       ...
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

mkdirSync(resolve(root, 'dev-docs'), { recursive: true });

console.log('\n=== [1/6] HTML: @signalwire/js ===');
run('npx typedoc --options packages/main/typedoc.json');

console.log('\n=== [2/6] HTML: @signalwire/web-components ===');
run('npx typedoc --options packages/web-components/typedoc.json');

console.log('\n=== [3/6] Markdown: @signalwire/js ===');
run('npx typedoc --options packages/main/typedoc.md.json');

console.log('\n=== [4/6] Markdown: @signalwire/web-components ===');
run('npx typedoc --options packages/web-components/typedoc.md.json');

console.log('\n=== [5/6] CEM: @signalwire/web-components ===');
run('npx cem analyze --config cem.config.mjs');

console.log('\n=== [6/6] Copying ./docs guides ===');
cpSync(resolve(root, 'docs'), resolve(root, 'dev-docs/guides'), { recursive: true });

console.log('\n✓ Documentation generated in ./dev-docs/\n');