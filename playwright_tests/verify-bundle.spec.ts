import { test, expect } from '@playwright/test';

/**
 * Verification test for browser bundle
 * This ensures the bundle loads correctly and exports are available
 */
test.describe('Browser Bundle Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8765');
    await page.context().grantPermissions(['microphone', 'camera']);
  });

  test('should load browser bundle successfully', async ({ page }) => {
    // Verify we can import the module dynamically
    const canImport = await page.evaluate(async () => {
      try {
        const module = await import('/dist/browser.mjs');
        return {
          hasController: typeof module.RTCPeerConnectionController === 'function',
          hasPreferences: typeof module.PreferencesContainer === 'function',
        };
      } catch (error) {
        return { error: String(error) };
      }
    });

    expect(canImport).toHaveProperty('hasController', true);
    expect(canImport).toHaveProperty('hasPreferences', true);
  });

  test('should create RTCPeerConnectionController instance', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { RTCPeerConnectionController } =
        await import('/dist/browser.mjs');

      const controller = new RTCPeerConnectionController({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        propose: 'main',
      });

      return {
        created: controller !== null,
        hasLocalDescription$: typeof controller.localDescription$ === 'object',
        hasConnectionState$: typeof controller.connectionState$ === 'object',
        type: controller.type,
      };
    });

    expect(result.created).toBe(true);
    expect(result.hasLocalDescription$).toBe(true);
    expect(result.hasConnectionState$).toBe(true);
    expect(result.type).toBe('offer'); // No remote SDP, so it's an offer
  });

  test('should have PreferencesContainer singleton', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PreferencesContainer } = await import('/dist/browser.mjs');

      const instance1 = PreferencesContainer.instance;
      const instance2 = PreferencesContainer.instance;

      return {
        hasSingleton: instance1 === instance2,
        hasReceiveAudio: typeof instance1.receiveAudio === 'boolean',
        hasReceiveVideo: typeof instance1.receiveVideo === 'boolean',
      };
    });

    expect(result.hasSingleton).toBe(true);
    expect(result.hasReceiveAudio).toBe(true);
    expect(result.hasReceiveVideo).toBe(true);
  });
});
