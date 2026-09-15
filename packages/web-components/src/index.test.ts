import { describe, it, expect, vi } from 'vitest';

/**
 * src/index.ts calls emitReadyEvent() as a side effect of being imported, so
 * the listener has to be attached before the dynamic import. The event and its
 * version payload are documented public behaviour, which is why this entry
 * point is not excluded from coverage along with the other barrels.
 */
describe('package entry point', () => {
  it('dispatches signalwire:web-components:ready with the package version on import', async () => {
    const handler = vi.fn();
    window.addEventListener('signalwire:web-components:ready', handler);

    try {
      const mod = await import('./index.js');

      expect(handler).toHaveBeenCalledTimes(1);

      const event = handler.mock.calls[0]![0] as CustomEvent<{ version: string }>;
      // __VERSION__ is a build-time define; vitest.config.ts supplies it from
      // package.json, and the module also re-exports it as `version`.
      expect(event.detail.version).toBe(mod.version);
      expect(event.detail.version).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      window.removeEventListener('signalwire:web-components:ready', handler);
    }
    // Generous timeout: this pulls in the whole component barrel, which is slow
    // under coverage instrumentation and exceeds the 5s default.
  }, 20_000);
});
