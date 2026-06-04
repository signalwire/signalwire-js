/**
 * E2E tests for sw-call-media web component
 *
 * Tests the main container component that renders remote video
 * and provides call context to child components.
 */
import { test, expect } from '@playwright/test';

test.describe('sw-call-media component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/test-harness.html');
    // Wait for the page to fully load and testFixtures to be available
    await page.waitForFunction(() => (window as any).testFixtures !== undefined, { timeout: 10000 });
  });

  test('renders and displays remote video stream when call.remoteStream$ emits', async ({ page }) => {
    // Create call-media element
    await page.evaluate(() => {
      const callMedia = document.createElement('sw-call-media');
      callMedia.id = 'test-call-media';
      document.getElementById('test-container')?.appendChild(callMedia);
    });

    // Set up mock call with remote stream
    await page.evaluate(() => {
      const { createMockCall, createMockMediaStream } = (window as any).testFixtures;
      const mockCall = createMockCall();
      const callMedia = document.getElementById('test-call-media') as any;
      callMedia.call = mockCall;

      // Emit a media stream
      const stream = createMockMediaStream({ hasVideo: true });
      mockCall.remoteStream$.next(stream);
    });

    // Wait for component update
    await page.waitForTimeout(100);

    // Verify video element has srcObject
    const videoHasSrc = await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media') as any;
      const video = callMedia.shadowRoot?.querySelector('video.mcu-video');
      return video?.srcObject !== null;
    });

    expect(videoHasSrc).toBe(true);

    // Verify video attributes
    const videoAttrs = await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media') as any;
      const video = callMedia.shadowRoot?.querySelector('video.mcu-video');
      return {
        autoplay: video?.hasAttribute('autoplay'),
        playsinline: video?.hasAttribute('playsinline'),
        muted: video?.hasAttribute('muted'),
      };
    });

    expect(videoAttrs.autoplay).toBe(true);
    expect(videoAttrs.playsinline).toBe(true);
    expect(videoAttrs.muted).toBe(true);
  });

  test('provides call context to child sw-participants component', async ({ page }) => {
    // Create nested component structure
    await page.evaluate(() => {
      const callMedia = document.createElement('sw-call-media');
      callMedia.id = 'test-call-media';
      const participants = document.createElement('sw-participants');
      participants.id = 'test-participants';
      callMedia.appendChild(participants);
      document.getElementById('test-container')?.appendChild(callMedia);
    });

    // Set up mock call with layout layers
    await page.evaluate(() => {
      const { createMockCall, createMockLayoutLayer } = (window as any).testFixtures;
      const mockCall = createMockCall({ selfId: 'self-user' });
      const callMedia = document.getElementById('test-call-media') as any;
      callMedia.call = mockCall;

      // Emit layout layers
      mockCall.layoutLayers$.next([
        createMockLayoutLayer({ member_id: 'participant-1', x: 10, y: 10, width: 40, height: 40 }),
        createMockLayoutLayer({ member_id: 'participant-2', x: 50, y: 10, width: 40, height: 40 }),
      ]);
    });

    // Wait for context propagation and render
    await page.waitForTimeout(200);

    // Verify participants renders overlays
    const overlayCount = await page.evaluate(() => {
      const participants = document.getElementById('test-participants') as any;
      const overlays = participants.shadowRoot?.querySelectorAll('.member-overlay');
      return overlays?.length ?? 0;
    });

    expect(overlayCount).toBe(2);
  });

  test('maintains aspect ratio using ResizeObserver', async ({ page }) => {
    // Set container to known size
    await page.evaluate(() => {
      const container = document.getElementById('test-container');
      if (container) {
        container.style.width = '800px';
        container.style.height = '600px';
      }
    });

    // Create call-media with video
    await page.evaluate(() => {
      const callMedia = document.createElement('sw-call-media');
      callMedia.id = 'test-call-media';
      document.getElementById('test-container')?.appendChild(callMedia);

      const { createMockCall, createMockMediaStream } = (window as any).testFixtures;
      const mockCall = createMockCall();
      callMedia.call = mockCall;

      const stream = createMockMediaStream({ videoWidth: 1920, videoHeight: 1080 });
      mockCall.remoteStream$.next(stream);
    });

    // Wait for resize observer to process
    await page.waitForTimeout(300);

    // Check padding-wrapper has dimension styles for aspect ratio
    const wrapperStyles = await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media') as any;
      const paddingWrapper = callMedia.shadowRoot?.querySelector('.padding-wrapper');
      return {
        width: paddingWrapper?.style.width || '',
        height: paddingWrapper?.style.height || '',
      };
    });

    // Should have width and height values set for proper sizing
    expect(wrapperStyles.width).toMatch(/px$/);
    expect(wrapperStyles.height).toMatch(/px$/);
  });

  test('cleans up subscriptions when disconnected', async ({ page }) => {
    // Create and setup component
    await page.evaluate(() => {
      const callMedia = document.createElement('sw-call-media');
      callMedia.id = 'test-call-media';
      document.getElementById('test-container')?.appendChild(callMedia);

      const { createMockCall, createMockMediaStream } = (window as any).testFixtures;
      const mockCall = createMockCall();
      (window as any).testMockCall = mockCall;
      callMedia.call = mockCall;

      const stream = createMockMediaStream();
      mockCall.remoteStream$.next(stream);
    });

    await page.waitForTimeout(100);

    // Remove component from DOM
    await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media');
      callMedia?.remove();
    });

    // Verify no errors when emitting to observable after disconnect
    const noError = await page.evaluate(() => {
      try {
        const mockCall = (window as any).testMockCall;
        mockCall.remoteStream$.next(null);
        return true;
      } catch {
        return false;
      }
    });

    expect(noError).toBe(true);
  });

  test('handles null/undefined stream gracefully', async ({ page }) => {
    await page.evaluate(() => {
      const callMedia = document.createElement('sw-call-media');
      callMedia.id = 'test-call-media';
      document.getElementById('test-container')?.appendChild(callMedia);

      const { createMockCall } = (window as any).testFixtures;
      const mockCall = createMockCall({ initialRemoteStream: null });
      (window as any).testMockCall = mockCall;
      callMedia.call = mockCall;
    });

    // Should render without errors
    const videoExists = await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media') as any;
      const video = callMedia.shadowRoot?.querySelector('video.mcu-video');
      return video !== null;
    });

    expect(videoExists).toBe(true);

    // srcObject should be null
    const srcIsNull = await page.evaluate(() => {
      const callMedia = document.getElementById('test-call-media') as any;
      const video = callMedia.shadowRoot?.querySelector('video.mcu-video');
      return video?.srcObject === null;
    });

    expect(srcIsNull).toBe(true);
  });
});
