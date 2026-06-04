/**
 * Load a Google Font into the document. Idempotent — calling twice with the
 * same arguments injects only one `<link>`.
 *
 * @example
 * useGoogleFont('Lexend', { weights: [400, 500, 700] });
 * useGoogleFont('JetBrains Mono');
 */
export interface UseGoogleFontOptions {
  /** Font weights to load. Defaults to `[400]`. */
  weights?: number[];
  /** `font-display` strategy. Defaults to `'swap'`. */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  /** Whether to load italic variants alongside the upright weights. */
  italic?: boolean;
}

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';

export function useGoogleFont(name: string, options: UseGoogleFontOptions = {}): void {
  if (typeof document === 'undefined') return;

  const weights = options.weights ?? [400];
  const display = options.display ?? 'swap';
  const family = name.replace(/\s+/g, '+');

  const axis = options.italic
    ? `ital,wght@${weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(';')}`
    : `wght@${weights.join(';')}`;

  const href = `${GOOGLE_FONTS_BASE}?family=${family}:${axis}&display=${display}`;

  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
