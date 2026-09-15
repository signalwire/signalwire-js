import { describe, it, expect } from 'vitest';
import { highlight, ensurePrismLang } from './prism.js';

describe('highlight', () => {
  it('highlights code for a known grammar', async () => {
    const html = await highlight('const x = 1;', 'javascript');
    // Prism wraps tokens in <span class="token …"> but keeps the source text.
    expect(html).toContain('const');
    expect(html).toContain('token');
  });

  it('loads dependent grammars (typescript depends on javascript)', async () => {
    const html = await highlight('let n: number = 1;', 'typescript');
    expect(html).toContain('token');
  });

  it('is case-insensitive about the language name', async () => {
    const html = await highlight('SELECT 1;', 'SQL');
    // Asserting on tokens, not just on the return type: if the uppercase name
    // failed to resolve, highlight would fall through to the raw-text path and
    // a `typeof html === 'string'` check would still pass.
    expect(html).toContain('token');
  });

  it('returns the raw text when the grammar is unknown', async () => {
    const raw = 'just some text';
    await expect(highlight(raw, 'not-a-real-language')).resolves.toBe(raw);
  });

  it('falls back to plaintext (raw text) when no language is given', async () => {
    const raw = 'plain';
    await expect(highlight(raw, '')).resolves.toBe(raw);
  });
});

describe('ensurePrismLang', () => {
  it('registers the grammar for a supported language', async () => {
    await ensurePrismLang('json');
    // resolves.toBeUndefined() is trivially true for a Promise<void>, so assert
    // the observable effect instead: the grammar is now on Prism.
    const prism = (await import('prismjs')) as unknown as {
      default?: { languages: Record<string, unknown> };
      languages?: Record<string, unknown>;
    };
    const languages = prism.languages ?? prism.default!.languages;
    expect(languages['json']).toBeDefined();
  });

  it('is idempotent — a second call short-circuits via the loaded cache', async () => {
    await ensurePrismLang('css');
    // Second call hits the `_loaded.has(lang)` early-return branch.
    await expect(ensurePrismLang('css')).resolves.toBeUndefined();
  });

  it('does not throw for an unknown language with no loader', async () => {
    await expect(ensurePrismLang('nope-lang')).resolves.toBeUndefined();
  });
});
