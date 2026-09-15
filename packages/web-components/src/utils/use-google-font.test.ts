import { describe, it, expect, beforeEach } from 'vitest';
import { useGoogleFont } from './use-google-font.js';

const FONT_LINKS = 'link[href^="https://fonts.googleapis.com"]';

const links = () =>
  Array.from(document.head.querySelectorAll(FONT_LINKS)) as HTMLLinkElement[];

describe('useGoogleFont', () => {
  beforeEach(() => {
    // Scoped to the font links this suite creates, so a <link> added by some
    // future setup file doesn't get removed as collateral.
    document.head.querySelectorAll(FONT_LINKS).forEach((l) => l.remove());
  });

  it('injects a stylesheet <link> into the document head', () => {
    useGoogleFont('Lexend');
    const link = links()[0]!;
    expect(link).toBeDefined();
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('https://fonts.googleapis.com/css2');
  });

  it('defaults to weight 400 and display=swap', () => {
    useGoogleFont('Lexend');
    const href = links()[0]!.href;
    expect(href).toContain('wght@400');
    expect(href).toContain('display=swap');
  });

  it('encodes multi-word family names with "+"', () => {
    useGoogleFont('Instrument Sans');
    expect(links()[0]!.href).toContain('family=Instrument+Sans');
  });

  it('serializes multiple weights joined by ";"', () => {
    useGoogleFont('Lexend', { weights: [300, 400, 700] });
    expect(links()[0]!.href).toContain('wght@300;400;700');
  });

  it('honors a custom display strategy', () => {
    useGoogleFont('Lexend', { display: 'optional' });
    expect(links()[0]!.href).toContain('display=optional');
  });

  it('builds the ital axis when italic is requested', () => {
    useGoogleFont('Lexend', { weights: [400, 700], italic: true });
    const href = decodeURIComponent(links()[0]!.href);
    expect(href).toContain('ital,wght@0,400;1,400;0,700;1,700');
  });

  it('is idempotent — the same request injects only one <link>', () => {
    useGoogleFont('Lexend', { weights: [400] });
    useGoogleFont('Lexend', { weights: [400] });
    expect(links()).toHaveLength(1);
  });

  it('injects a distinct <link> when the request differs', () => {
    useGoogleFont('Lexend', { weights: [400] });
    useGoogleFont('Lexend', { weights: [700] });
    expect(links()).toHaveLength(2);
  });
});
