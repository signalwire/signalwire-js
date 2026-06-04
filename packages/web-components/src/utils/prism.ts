// Lazy-loaded Prism. The core and every language pack are loaded via
// dynamic `import(...)`, so consumers that never call `highlight()` (and
// downstream bundlers consuming the package barrel) don't pay for Prism.

type PrismNS = typeof import('prismjs');

let _prism: Promise<PrismNS> | null = null;
const getPrism = (): Promise<PrismNS> => (_prism ??= import('prismjs'));

const PRISM_LANGS: Record<string, () => Promise<unknown>> = {
  javascript: () => import('prismjs/components/prism-javascript'),
  typescript: () => import('prismjs/components/prism-typescript'),
  python:     () => import('prismjs/components/prism-python'),
  bash:       () => import('prismjs/components/prism-bash'),
  shell:      () => import('prismjs/components/prism-bash'),
  json:       () => import('prismjs/components/prism-json'),
  css:        () => import('prismjs/components/prism-css'),
  yaml:       () => import('prismjs/components/prism-yaml'),
  sql:        () => import('prismjs/components/prism-sql'),
  markdown:   () => import('prismjs/components/prism-markdown'),
};

const PRISM_DEPS: Partial<Record<string, string[]>> = {
  typescript: ['javascript'],
};

const _loaded = new Set<string>();

export async function ensurePrismLang(lang: string): Promise<void> {
  if (_loaded.has(lang)) return;
  // Core must be resolved before any language pack registers on it.
  await getPrism();
  for (const dep of PRISM_DEPS[lang] ?? []) {
    await ensurePrismLang(dep);
  }
  const loader = PRISM_LANGS[lang];
  if (loader) {
    await loader();
    _loaded.add(lang);
  }
}

/** Highlight `code` with Prism. Returns highlighted HTML, or the raw text if the grammar is unknown. */
export async function highlight(code: string, language: string): Promise<string> {
  const lang = (language || 'plaintext').toLowerCase();
  await ensurePrismLang(lang);
  const Prism = await getPrism();
  const grammar = Prism.languages[lang];
  return grammar ? Prism.highlight(code, grammar, lang) : code;
}
