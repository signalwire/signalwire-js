import themeCss from '../theme.css?inline';
import { useGoogleFont } from './use-google-font.js';

let themeAdopted = false;

/**
 * Inject the SignalWire design-token stylesheet into the document so all
 * components — including those in shadow roots — can resolve `--bg-page`,
 * `--fg-default`, `--interactive-button-primary-bg`, etc.
 *
 * Idempotent. Calling twice is a no-op.
 */
export function ensureSignalWireTheme(): void {
  if (typeof document === 'undefined' || themeAdopted) return;
  themeAdopted = true;

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(themeCss);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

/** Load the three SignalWire brand font families via Google Fonts. */
export function ensureSignalWireFonts(): void {
  useGoogleFont('Lexend', { weights: [300, 400, 500, 600, 700] });
  useGoogleFont('Instrument Sans', { weights: [400, 500, 600, 700] });
  useGoogleFont('JetBrains Mono', { weights: [400, 500] });
}
