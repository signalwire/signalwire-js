// @vitest-environment jsdom
// dompurify >= 3.4.8 silently fails to sanitize under happy-dom, so these
// tests must run in jsdom (see https://github.com/capricorn86/happy-dom).
import { describe, it, expect, afterEach } from 'vitest';
import './sw-ui-content-drawer.js';
import type { SwUiContentDrawer } from './sw-ui-content-drawer.js';

// jsdom does not implement ResizeObserver, which connectedCallback needs.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

async function mountDrawer(props: Partial<SwUiContentDrawer>): Promise<SwUiContentDrawer> {
  const el = document.createElement('sw-ui-content-drawer') as SwUiContentDrawer;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  // _renderContent runs in updated() and is async (dynamic imports + marked).
  // Poll the private state until the render settles.
  const start = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((el as any)._renderFormat !== props.format && Date.now() - start < 2000) {
    await new Promise((r) => setTimeout(r, 10));
    await el.updateComplete;
  }
  return el;
}

function renderedHtml(el: SwUiContentDrawer): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (el as any)._renderedHtml as string;
}

describe('sw-ui-content-drawer DOMPurify XSS hardening', () => {
  let el: SwUiContentDrawer | null = null;

  afterEach(() => {
    el?.remove();
    el = null;
  });

  describe('format="html"', () => {
    it('strips <script> tags', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<p>safe</p><script>window.__pwn = 1;</script>',
      });
      const out = renderedHtml(el);
      expect(out).toContain('<p>safe</p>');
      expect(out.toLowerCase()).not.toContain('<script');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((window as any).__pwn).toBeUndefined();
    });

    it('strips inline event handlers (onerror, onclick, onfocus, onpointerdown)', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: `
          <img src="x" onerror="window.__pwn1=1">
          <a href="#" onclick="window.__pwn2=1">x</a>
          <div onfocus="window.__pwn3=1" tabindex="0">x</div>
          <span onpointerdown="window.__pwn4=1">x</span>
        `,
      });
      const out = renderedHtml(el).toLowerCase();
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('onclick');
      expect(out).not.toContain('onfocus');
      expect(out).not.toContain('onpointerdown');
    });

    it('strips javascript: URLs in href', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<a href="javascript:window.__pwn=1">click</a>',
      });
      const out = renderedHtml(el).toLowerCase();
      expect(out).not.toContain('javascript:');
    });

    it('strips inline style attributes (avoids expression / data exfil tricks)', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<p style="background:url(javascript:alert(1))">x</p>',
      });
      const out = renderedHtml(el);
      expect(out.toLowerCase()).not.toContain('style=');
    });

    it('strips <iframe> with src attribute (no embedded navigation)', async () => {
      // happy-dom has parsing quirks for some sectioning elements
      // (object/embed/form), so we focus on the highest-risk navigation case
      // here. Real-browser behavior is covered by DOMPurify's own tests.
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<p>before</p><iframe src="about:blank"></iframe><p>after</p>',
      });
      const out = renderedHtml(el).toLowerCase();
      expect(out).toContain('<p>before</p>');
      expect(out).toContain('<p>after</p>');
      expect(out).not.toContain('iframe');
    });

    it('forces rel="noopener noreferrer" on <a target="_blank">', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<a href="https://example.com" target="_blank">link</a>',
      });
      const out = renderedHtml(el);
      expect(out).toMatch(/<a[^>]*target="_blank"[^>]*>/);
      expect(out).toMatch(/rel="noopener noreferrer"/);
    });

    it('overrides any user-supplied rel when target is set (no rel="opener" bypass)', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content:
          '<a href="https://example.com" target="_blank" rel="opener">link</a>',
      });
      const out = renderedHtml(el);
      expect(out).toContain('rel="noopener noreferrer"');
      expect(out).not.toContain('rel="opener"');
    });

    it('does not add rel when there is no target attribute', async () => {
      el = await mountDrawer({
        open: true,
        format: 'html',
        content: '<a href="https://example.com">link</a>',
      });
      const out = renderedHtml(el);
      expect(out).not.toContain('rel=');
    });
  });

  describe('format="markdown"', () => {
    it('strips raw <script> embedded in markdown', async () => {
      el = await mountDrawer({
        open: true,
        format: 'markdown',
        content: '# Hello\n\n<script>window.__pwnMd=1</script>\n\nbody',
      });
      const out = renderedHtml(el).toLowerCase();
      expect(out).toContain('<h1');
      expect(out).not.toContain('<script');
    });

    it('strips javascript: URLs from markdown link syntax', async () => {
      el = await mountDrawer({
        open: true,
        format: 'markdown',
        content: '[click](javascript:window.__pwnMd2=1)',
      });
      const out = renderedHtml(el).toLowerCase();
      expect(out).not.toContain('javascript:');
    });

    it('forces rel="noopener noreferrer" on markdown links rendered with target', async () => {
      // Markdown itself does not emit target="_blank", but raw HTML inside
      // markdown should still get the rel hardening.
      el = await mountDrawer({
        open: true,
        format: 'markdown',
        content: 'See <a href="https://example.com" target="_blank">site</a>.',
      });
      const out = renderedHtml(el);
      expect(out).toContain('rel="noopener noreferrer"');
    });
  });
});
