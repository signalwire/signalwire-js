import { describe, it, expect, beforeEach } from 'vitest';
import { ensureSignalWireTheme, ensureSignalWireFonts } from './theme-loader.js';

describe('ensureSignalWireTheme', () => {
  // `themeAdopted` is module-level state, so both halves of the adopt/no-op
  // behaviour have to live in one test. Splitting or reordering this would need
  // vi.resetModules() to get a fresh module instance.
  it('adopts a constructed stylesheet into the document once, then no-ops', () => {
    const before = document.adoptedStyleSheets.length;

    // First call: themeAdopted is false → adopt.
    ensureSignalWireTheme();
    const after = document.adoptedStyleSheets.length;
    expect(after).toBe(before + 1);

    // Second call: themeAdopted is true → guard returns early, no new sheet.
    ensureSignalWireTheme();
    expect(document.adoptedStyleSheets.length).toBe(after);
  });
});

describe('ensureSignalWireFonts', () => {
  const FONT_LINKS = 'link[href^="https://fonts.googleapis.com"]';

  beforeEach(() => {
    // Scoped to the font links this suite creates, so a <link> added by some
    // future setup file doesn't get removed as collateral.
    document.head.querySelectorAll(FONT_LINKS).forEach((l) => l.remove());
  });

  it('loads the three SignalWire brand font families with their weights', () => {
    ensureSignalWireFonts();
    const hrefs = Array.from(document.head.querySelectorAll(FONT_LINKS))
      .map((l) => decodeURIComponent((l as HTMLLinkElement).href))
      .join(' ');
    expect(hrefs).toContain('family=Lexend:wght@300;400;500;600;700');
    expect(hrefs).toContain('family=Instrument+Sans:wght@400;500;600;700');
    expect(hrefs).toContain('family=JetBrains+Mono:wght@400;500');
  });
});
