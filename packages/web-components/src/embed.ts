/**
 * Embed bundle entry point.
 *
 * Registers all custom elements as side effects and re-exports key SDK
 * classes so script-tag consumers can use them without a separate import.
 *
 * @example
 * ```html
 * <script src="signalwire-web-components-embed.js"></script>
 * <sw-call-widget token="..." destination="/public/my-room"></sw-call-widget>
 *
 * <script>
 *   // SDK classes available on the global:
 *   const { SignalWire, StaticCredentialProvider } = SignalWireUI;
 * </script>
 * ```
 */

// ── All web components (registers custom elements) ────────────────────────
export * from './index.js';

// ── SDK classes needed for programmatic use in script-tag contexts ─────────
export {
  SignalWire,
  StaticCredentialProvider,
  EmbedTokenCredentialProvider
} from '@signalwire/js';
