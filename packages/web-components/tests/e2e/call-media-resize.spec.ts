/**
 * E2E tests for sw-call-media resize behavior
 *
 * Tests the component's ability to maintain aspect ratio and
 * stay within viewport bounds across different screen sizes
 * and media orientations.
 *
 * Requirements:
 * - ALWAYS keep aspect-ratio 16:9 or 9:16
 * - Orientation dictated by media size (can switch dynamically)
 * - Media must grow as much as allowed by parent container
 * - Media must NEVER grow bigger than visible height/width
 */
import { test, expect, Page } from '@playwright/test';

// Viewport configurations for testing
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  desktopSmall: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  mobile: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  ultrawide: { width: 1920, height: 800 },
  narrow: { width: 400, height: 800 },
};

// Media dimensions for testing
const MEDIA_DIMENSIONS = {
  landscape16x9: { width: 1920, height: 1080 },
  landscape4x3: { width: 1024, height: 768 },
  portrait9x16: { width: 1080, height: 1920 },
  portrait3x4: { width: 768, height: 1024 },
  square: { width: 1080, height: 1080 },
};

// Tolerance for aspect ratio comparison (5%)
const ASPECT_RATIO_TOLERANCE = 0.05;

/**
 * Helper to get call-media dimensions and computed styles
 */
async function getCallMediaMetrics(page: Page) {
  return page.evaluate(() => {
    const callMedia = document.getElementById('test-call-media') as any;
    const video = callMedia?.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement;
    const paddingWrapper = callMedia?.shadowRoot?.querySelector('.padding-wrapper') as HTMLElement;
    const mcuContent = callMedia?.shadowRoot?.querySelector('.mcu-content') as HTMLElement;

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
      },
      callMedia: callMedia ? {
        offsetWidth: callMedia.offsetWidth,
        offsetHeight: callMedia.offsetHeight,
        clientWidth: callMedia.clientWidth,
        clientHeight: callMedia.clientHeight,
        boundingRect: callMedia.getBoundingClientRect(),
      } : null,
      video: video ? {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        offsetWidth: video.offsetWidth,
        offsetHeight: video.offsetHeight,
        boundingRect: video.getBoundingClientRect(),
      } : null,
      paddingWrapper: paddingWrapper ? {
        offsetWidth: paddingWrapper.offsetWidth,
        offsetHeight: paddingWrapper.offsetHeight,
        boundingRect: paddingWrapper.getBoundingClientRect(),
        style: {
          width: paddingWrapper.style.width,
          height: paddingWrapper.style.height,
          paddingBottom: paddingWrapper.style.paddingBottom,
          transform: paddingWrapper.style.transform,
        },
      } : null,
      mcuContent: mcuContent ? {
        offsetWidth: mcuContent.offsetWidth,
        offsetHeight: mcuContent.offsetHeight,
        boundingRect: mcuContent.getBoundingClientRect(),
      } : null,
    };
  });
}

/**
 * Helper to set up test environment with call-media component
 */
async function setupCallMedia(page: Page, containerSize?: { width: string; height: string }) {
  // Set container size if specified
  if (containerSize) {
    await page.evaluate((size) => {
      const container = document.getElementById('test-container');
      if (container) {
        container.style.width = size.width;
        container.style.height = size.height;
      }
    }, containerSize);
  }

  // Create call-media element
  await page.evaluate(() => {
    const container = document.getElementById('test-container');
    if (container) {
      container.innerHTML = '';
    }
    const callMedia = document.createElement('sw-call-media');
    callMedia.id = 'test-call-media';
    container?.appendChild(callMedia);
  });
}

/**
 * Helper to set mock video stream with specific dimensions
 */
async function setMockStream(page: Page, dimensions: { width: number; height: number }) {
  await page.evaluate((dims) => {
    const { createMockCall, createMockMediaStream } = (window as any).testFixtures;
    const mockCall = createMockCall();
    const callMedia = document.getElementById('test-call-media') as any;
    callMedia.call = mockCall;

    const stream = createMockMediaStream({
      hasVideo: true,
      videoWidth: dims.width,
      videoHeight: dims.height,
    });
    mockCall.remoteStream$.next(stream);

    // Store mock call for later use
    (window as any).testMockCall = mockCall;
  }, dimensions);

  // Wait for stream to be processed and ResizeObserver to fire
  await page.waitForTimeout(500);
}

/**
 * Calculate expected aspect ratio from video dimensions
 */
function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Check if two aspect ratios are within tolerance
 */
function aspectRatiosMatch(ratio1: number, ratio2: number, tolerance: number = ASPECT_RATIO_TOLERANCE): boolean {
  return Math.abs(ratio1 - ratio2) / ratio1 <= tolerance;
}

test.describe('sw-call-media resize behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/test-harness.html');
    await page.waitForFunction(() => (window as any).testFixtures !== undefined, { timeout: 10000 });
  });

  test.describe('Landscape media (16:9)', () => {
    const landscapeDims = MEDIA_DIMENSIONS.landscape16x9;
    const expectedRatio = calculateAspectRatio(landscapeDims.width, landscapeDims.height);

    test('fits within desktop viewport without overflow', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, landscapeDims);

      const metrics = await getCallMediaMetrics(page);

      // Take screenshot for evidence
      await page.screenshot({ path: 'test-results/landscape-desktop.png' });

      // Verify no horizontal scroll
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Verify call-media doesn't exceed viewport
      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }

      // Verify video has proper dimensions (not 0)
      if (metrics.video) {
        expect(metrics.video.videoWidth).toBe(landscapeDims.width);
        expect(metrics.video.videoHeight).toBe(landscapeDims.height);
      }
    });

    test('fits within narrow viewport without overflow', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.narrow);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, landscapeDims);

      const metrics = await getCallMediaMetrics(page);

      await page.screenshot({ path: 'test-results/landscape-narrow.png' });

      // Verify no horizontal scroll
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Verify call-media doesn't exceed viewport width
      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
      }
    });

    test('fits within mobile landscape viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobileLandscape);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, landscapeDims);

      const metrics = await getCallMediaMetrics(page);

      await page.screenshot({ path: 'test-results/landscape-mobile-landscape.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('maintains 16:9 aspect ratio when resizing', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, landscapeDims);

      // Get initial metrics
      const initialMetrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/landscape-resize-initial.png' });

      // Resize to smaller viewport
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(300); // Wait for ResizeObserver

      const resizedMetrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/landscape-resize-tablet.png' });

      // Verify aspect ratio maintained in padding wrapper
      if (resizedMetrics.paddingWrapper && resizedMetrics.paddingWrapper.offsetWidth > 0) {
        const actualRatio = resizedMetrics.paddingWrapper.offsetWidth / resizedMetrics.paddingWrapper.offsetHeight;
        expect(aspectRatiosMatch(actualRatio, expectedRatio)).toBe(true);
      }

      // Verify no overflow after resize
      expect(resizedMetrics.document.hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Portrait media (9:16)', () => {
    const portraitDims = MEDIA_DIMENSIONS.portrait9x16;
    const expectedRatio = calculateAspectRatio(portraitDims.width, portraitDims.height);

    test('fits within desktop viewport without overflow', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, portraitDims);

      const metrics = await getCallMediaMetrics(page);

      await page.screenshot({ path: 'test-results/portrait-desktop.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('fits within mobile portrait viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, portraitDims);

      const metrics = await getCallMediaMetrics(page);

      await page.screenshot({ path: 'test-results/portrait-mobile.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('fits within ultrawide viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.ultrawide);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, portraitDims);

      const metrics = await getCallMediaMetrics(page);

      await page.screenshot({ path: 'test-results/portrait-ultrawide.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Portrait video in ultrawide should be height-constrained
      if (metrics.callMedia && metrics.callMedia.boundingRect.height > 0) {
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('maintains 9:16 aspect ratio when resizing', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, portraitDims);

      await page.screenshot({ path: 'test-results/portrait-resize-initial.png' });

      // Resize to mobile
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/portrait-resize-mobile.png' });

      // Verify no overflow
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Verify aspect ratio maintained
      if (metrics.paddingWrapper && metrics.paddingWrapper.offsetWidth > 0 && metrics.paddingWrapper.offsetHeight > 0) {
        const actualRatio = metrics.paddingWrapper.offsetWidth / metrics.paddingWrapper.offsetHeight;
        expect(aspectRatiosMatch(actualRatio, expectedRatio)).toBe(true);
      }
    });
  });

  test.describe('Dynamic orientation switching', () => {
    test('handles landscape to portrait stream change', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });

      // Start with landscape
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);
      await page.screenshot({ path: 'test-results/switch-landscape.png' });

      let metrics = await getCallMediaMetrics(page);
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Switch to portrait
      await page.evaluate((dims) => {
        const { createMockMediaStream } = (window as any).testFixtures;
        const mockCall = (window as any).testMockCall;
        const stream = createMockMediaStream({
          hasVideo: true,
          videoWidth: dims.width,
          videoHeight: dims.height,
        });
        mockCall.remoteStream$.next(stream);
      }, MEDIA_DIMENSIONS.portrait9x16);

      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/switch-to-portrait.png' });

      metrics = await getCallMediaMetrics(page);
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('handles portrait to landscape stream change', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });

      // Start with portrait
      await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);
      await page.screenshot({ path: 'test-results/switch-portrait.png' });

      let metrics = await getCallMediaMetrics(page);
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      // Switch to landscape
      await page.evaluate((dims) => {
        const { createMockMediaStream } = (window as any).testFixtures;
        const mockCall = (window as any).testMockCall;
        const stream = createMockMediaStream({
          hasVideo: true,
          videoWidth: dims.width,
          videoHeight: dims.height,
        });
        mockCall.remoteStream$.next(stream);
      }, MEDIA_DIMENSIONS.landscape16x9);

      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/switch-to-landscape.png' });

      metrics = await getCallMediaMetrics(page);
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });
  });

  test.describe('Viewport resize handling', () => {
    test('adapts when viewport shrinks horizontally', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      await page.screenshot({ path: 'test-results/shrink-initial.png' });

      // Progressively shrink viewport width
      for (const width of [1000, 800, 600, 400]) {
        await page.setViewportSize({ width, height: VIEWPORTS.desktop.height });
        await page.waitForTimeout(200);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: `test-results/shrink-width-${width}.png` });

        // Should never have horizontal scroll
        expect(metrics.document.hasHorizontalScroll).toBe(false);

        // Call media should not exceed viewport
        if (metrics.callMedia && metrics.callMedia.offsetWidth > 0) {
          expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(width);
        }
      }
    });

    test('adapts when viewport shrinks vertically', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      // Progressively shrink viewport height
      for (const height of [600, 500, 400, 300]) {
        await page.setViewportSize({ width: VIEWPORTS.desktop.width, height });
        await page.waitForTimeout(200);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: `test-results/shrink-height-${height}.png` });

        // Call media should not exceed viewport height
        if (metrics.callMedia && metrics.callMedia.offsetHeight > 0) {
          expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(height);
        }
      }
    });

    test('handles rapid viewport size changes', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      // Rapid resize sequence
      const sizes = [
        VIEWPORTS.desktop,
        VIEWPORTS.mobile,
        VIEWPORTS.tablet,
        VIEWPORTS.mobileLandscape,
        VIEWPORTS.narrow,
        VIEWPORTS.desktop,
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(150);
      }

      // After settling, verify no overflow
      await page.waitForTimeout(300);
      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/rapid-resize-final.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Edge cases', () => {
    test('handles square video (1:1)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.square);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/square-video.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('handles 4:3 aspect ratio video', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape4x3);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/4x3-video.png' });

      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia) {
        expect(metrics.callMedia.boundingRect.right).toBeLessThanOrEqual(metrics.viewport.width);
        expect(metrics.callMedia.boundingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      }
    });

    test('handles very small viewport (minimum usable size)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 480 });
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/minimum-viewport.png' });

      // Should handle gracefully without overflow
      expect(metrics.document.hasHorizontalScroll).toBe(false);
    });

    test('handles container with fixed dimensions smaller than viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '400px', height: '300px' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/fixed-container.png' });

      // Should fit within the fixed container
      if (metrics.callMedia) {
        expect(metrics.callMedia.offsetWidth).toBeLessThanOrEqual(400);
        expect(metrics.callMedia.offsetHeight).toBeLessThanOrEqual(300);
      }
    });
  });

  test.describe('Regression: Width exceeds viewport (known issue)', () => {
    test('media width should not exceed window width when resizing to small viewport', async ({ page }) => {
      // This test captures the reported bug where media width grows beyond viewport
      await page.setViewportSize(VIEWPORTS.desktop);
      await setupCallMedia(page, { width: '100%', height: '100%' });
      await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

      await page.screenshot({ path: 'test-results/regression-initial.png' });

      // Resize to 1/4 of original (as described in bug report)
      await page.setViewportSize({ width: 320, height: 200 });
      await page.waitForTimeout(300);

      const metrics = await getCallMediaMetrics(page);
      await page.screenshot({ path: 'test-results/regression-quarter-size.png' });

      // This assertion captures the bug - media should never exceed viewport
      expect(metrics.document.hasHorizontalScroll).toBe(false);

      if (metrics.callMedia && metrics.callMedia.offsetWidth > 0) {
        expect(
          metrics.callMedia.boundingRect.right,
          'Call media right edge should not exceed viewport width'
        ).toBeLessThanOrEqual(metrics.viewport.width);
      }

      if (metrics.video && metrics.video.offsetWidth > 0) {
        expect(
          metrics.video.boundingRect.right,
          'Video right edge should not exceed viewport width'
        ).toBeLessThanOrEqual(metrics.viewport.width);
      }
    });
  });

  test.describe('Container bleeding viewport - centering behavior', () => {
    // Tolerance for center position comparison (pixels)
    const CENTER_TOLERANCE = 5;

    /**
     * Helper to calculate if video is centered in visible area
     */
    function isVideoCenteredInVisibleArea(
      videoBounds: DOMRect,
      containerBounds: DOMRect,
      viewport: { width: number; height: number }
    ): { horizontally: boolean; vertically: boolean; details: any } {
      // Calculate visible area (intersection of container and viewport)
      const visibleLeft = Math.max(0, containerBounds.left);
      const visibleTop = Math.max(0, containerBounds.top);
      const visibleRight = Math.min(viewport.width, containerBounds.right);
      const visibleBottom = Math.min(viewport.height, containerBounds.bottom);

      // Center of visible area
      const visibleCenterX = (visibleLeft + visibleRight) / 2;
      const visibleCenterY = (visibleTop + visibleBottom) / 2;

      // Center of video
      const videoCenterX = (videoBounds.left + videoBounds.right) / 2;
      const videoCenterY = (videoBounds.top + videoBounds.bottom) / 2;

      // Check if video center is within tolerance of visible center
      const horizontalOffset = Math.abs(videoCenterX - visibleCenterX);
      const verticalOffset = Math.abs(videoCenterY - visibleCenterY);

      return {
        horizontally: horizontalOffset <= CENTER_TOLERANCE,
        vertically: verticalOffset <= CENTER_TOLERANCE,
        details: {
          visibleArea: { left: visibleLeft, top: visibleTop, right: visibleRight, bottom: visibleBottom },
          visibleCenter: { x: visibleCenterX, y: visibleCenterY },
          videoCenter: { x: videoCenterX, y: videoCenterY },
          offset: { horizontal: horizontalOffset, vertical: verticalOffset },
        },
      };
    }

    test.describe('Landscape media (16:9)', () => {
      test('centers video when container bleeds horizontally (narrow viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        await page.screenshot({ path: 'test-results/center-landscape-initial.png' });

        // Shrink viewport width to cause horizontal bleeding
        await page.setViewportSize({ width: 500, height: 800 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-landscape-narrow.png' });

        // Verify video is within viewport
        expect(metrics.document.hasHorizontalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
        }
      });

      test('centers video when container bleeds vertically (short viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        // Shrink viewport height to cause vertical bleeding
        await page.setViewportSize({ width: 1200, height: 300 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-landscape-short.png' });

        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.vertically,
            `Video should be vertically centered. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });

      test('centers video when container bleeds both dimensions (small viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        // Shrink viewport in both dimensions (use 500x400 to avoid test harness interference)
        await page.setViewportSize({ width: 500, height: 400 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-landscape-small.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Video should be vertically centered. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });
    });

    test.describe('Portrait media (9:16)', () => {
      test('centers video when container bleeds horizontally (narrow viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        await page.screenshot({ path: 'test-results/center-portrait-initial.png' });

        // Shrink viewport width
        await page.setViewportSize({ width: 300, height: 800 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-portrait-narrow.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
        }
      });

      test('centers video when container bleeds vertically (short viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        // Shrink viewport height significantly
        await page.setViewportSize({ width: 800, height: 400 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-portrait-short.png' });

        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.vertically,
            `Video should be vertically centered. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });

      test('centers video when container bleeds both dimensions (small viewport)', async ({ page }) => {
        // Start with large viewport
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        // Shrink viewport in both dimensions
        await page.setViewportSize({ width: 300, height: 400 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-portrait-small.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);
        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Video should be vertically centered. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });
    });

    test.describe('Screen orientation changes', () => {
      test('maintains centering when switching from landscape to portrait screen orientation', async ({ page }) => {
        // Start with landscape screen orientation
        await page.setViewportSize({ width: 1024, height: 600 });
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        await page.screenshot({ path: 'test-results/center-orientation-landscape-screen.png' });

        // Switch to portrait screen orientation (simulate device rotation)
        await page.setViewportSize({ width: 600, height: 1024 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-orientation-portrait-screen.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);
        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered after orientation change. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Video should be vertically centered after orientation change. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });

      test('maintains centering when switching from portrait to landscape screen orientation', async ({ page }) => {
        // Start with portrait screen orientation
        await page.setViewportSize({ width: 600, height: 1024 });
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        await page.screenshot({ path: 'test-results/center-orientation-portrait-screen-start.png' });

        // Switch to landscape screen orientation
        await page.setViewportSize({ width: 1024, height: 600 });
        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-orientation-landscape-screen-end.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);
        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Video should be horizontally centered after orientation change. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Video should be vertically centered after orientation change. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });

      test('handles landscape media on portrait screen with bleeding', async ({ page }) => {
        // Portrait screen with landscape media - common mobile scenario
        await page.setViewportSize({ width: 375, height: 667 });
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-landscape-media-portrait-screen.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);
        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Landscape media should be horizontally centered on portrait screen. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Landscape media should be vertically centered on portrait screen. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });

      test('handles portrait media on landscape screen with bleeding', async ({ page }) => {
        // Landscape screen with portrait media
        await page.setViewportSize({ width: 667, height: 375 });
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        await page.waitForTimeout(300);

        const metrics = await getCallMediaMetrics(page);
        await page.screenshot({ path: 'test-results/center-portrait-media-landscape-screen.png' });

        expect(metrics.document.hasHorizontalScroll).toBe(false);
        expect(metrics.document.hasVerticalScroll).toBe(false);

        if (metrics.paddingWrapper && metrics.callMedia) {
          const centering = isVideoCenteredInVisibleArea(
            metrics.paddingWrapper.boundingRect as DOMRect,
            metrics.callMedia.boundingRect as DOMRect,
            metrics.viewport
          );

          expect(
            centering.horizontally,
            `Portrait media should be horizontally centered on landscape screen. Offset: ${centering.details.offset.horizontal}px`
          ).toBe(true);
          expect(
            centering.vertically,
            `Portrait media should be vertically centered on landscape screen. Offset: ${centering.details.offset.vertical}px`
          ).toBe(true);
        }
      });
    });

    test.describe('Progressive resize with centering', () => {
      test('maintains centering through progressive width reduction', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.landscape16x9);

        // Progressively reduce width
        const widths = [1000, 800, 600, 400, 300];

        for (const width of widths) {
          await page.setViewportSize({ width, height: VIEWPORTS.desktop.height });
          await page.waitForTimeout(200);

          const metrics = await getCallMediaMetrics(page);
          await page.screenshot({ path: `test-results/center-progressive-width-${width}.png` });

          expect(metrics.document.hasHorizontalScroll).toBe(false);

          if (metrics.paddingWrapper && metrics.callMedia) {
            const centering = isVideoCenteredInVisibleArea(
              metrics.paddingWrapper.boundingRect as DOMRect,
              metrics.callMedia.boundingRect as DOMRect,
              metrics.viewport
            );

            expect(
              centering.horizontally,
              `Video should be horizontally centered at width ${width}. Offset: ${centering.details.offset.horizontal}px`
            ).toBe(true);
          }
        }
      });

      test('maintains centering through progressive height reduction', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await setupCallMedia(page, { width: '100%', height: '100%' });
        await setMockStream(page, MEDIA_DIMENSIONS.portrait9x16);

        // Progressively reduce height
        const heights = [700, 600, 500, 400, 300];

        for (const height of heights) {
          await page.setViewportSize({ width: VIEWPORTS.desktop.width, height });
          await page.waitForTimeout(200);

          const metrics = await getCallMediaMetrics(page);
          await page.screenshot({ path: `test-results/center-progressive-height-${height}.png` });

          expect(metrics.document.hasVerticalScroll).toBe(false);

          if (metrics.paddingWrapper && metrics.callMedia) {
            const centering = isVideoCenteredInVisibleArea(
              metrics.paddingWrapper.boundingRect as DOMRect,
              metrics.callMedia.boundingRect as DOMRect,
              metrics.viewport
            );

            expect(
              centering.vertically,
              `Video should be vertically centered at height ${height}. Offset: ${centering.details.offset.vertical}px`
            ).toBe(true);
          }
        }
      });
    });
  });
});
