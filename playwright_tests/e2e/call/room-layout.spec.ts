/**
 * Room Layout — E2E Test Suite
 *
 * Tests the room layout feature of the SignalWire Browser SDK:
 * - Listing available layouts via `call.layouts$` / `call.layouts`
 * - Reading the current layout via `call.layout$` / `call.layout`
 * - Changing the layout via `call.setLayout()`
 * - Error handling for invalid layout names
 *
 * All tests use `?channel=video` because layouts apply to video conferencing.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Room Layout', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
        try {
          if (window.__swCall) await window.__swCall.hangup();
        } catch {
          /* call may already be ended */
        }
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {
          /* client may already be disconnected */
        }
      })
      .catch(() => {});
  });

  test('layouts$ lists available layouts', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-layout', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const layouts = await waitFor(
            call.layouts$,
            (l: string[]) => Array.isArray(l) && l.length > 0,
            obsTimeout,
            'layouts$ → non-empty array'
          );

          return {
            success: true,
            count: layouts.length,
            allStrings: layouts.every((l: string) => typeof l === 'string' && l.length > 0),
            layouts,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `layouts$ emitted available layouts — ${result.error ?? ''}`).toBe(true);
    expect(result.count, 'at least one layout is available').toBeGreaterThanOrEqual(1);
    expect(result.allStrings, 'all layout names are non-empty strings').toBe(true);
  });

  test('layout$ emits current layout', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-layout', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const layout = await waitFor(
            call.layout$,
            (l: string) => typeof l === 'string' && l.length > 0,
            obsTimeout,
            'layout$ → non-empty string'
          );

          return {
            success: true,
            layout,
            syncLayout: call.layout,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `layout$ emitted current layout — ${result.error ?? ''}`).toBe(true);
    expect(result.layout, 'current layout is a non-empty string').toBeTruthy();
    expect(typeof result.syncLayout, 'sync getter call.layout returns a string').toBe('string');
  });

  test('setLayout changes the current layout', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-layout', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Wait for layouts to be available
          const layouts = await waitFor(
            call.layouts$,
            (l: string[]) => Array.isArray(l) && l.length > 0,
            obsTimeout,
            'layouts$ → non-empty array'
          );

          // Get current layout
          const currentLayout = await waitFor(
            call.layout$,
            (l: string) => typeof l === 'string' && l.length > 0,
            obsTimeout,
            'layout$ → initial value'
          );

          // Pick a different layout from the available list
          const targetLayout = layouts.find((l: string) => l !== currentLayout) ?? layouts[0];

          // Set the new layout
          await call.setLayout(targetLayout);

          // Verify layout$ emits the new value
          const newLayout = await waitFor(
            call.layout$,
            (l: string) => l === targetLayout,
            obsTimeout,
            `layout$ → ${targetLayout}`
          );

          return {
            success: true,
            currentLayout,
            targetLayout,
            newLayout,
            layoutChanged: newLayout === targetLayout,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `setLayout changed layout — ${result.error ?? ''}`).toBe(true);
    expect(result.layoutChanged, 'layout$ emitted the target layout after setLayout').toBe(true);
    expect(result.newLayout, 'new layout matches the requested layout').toBe(result.targetLayout);
  });

  test('setLayout with grid-responsive', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-layout', channel: 'video' });

    // ── PRE-CHECK: skip if grid-responsive is not available ─
    const hasGridResponsive = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        const call = window.__swCall;
        const layouts = await waitFor(
          call.layouts$,
          (l: string[]) => Array.isArray(l) && l.length > 0,
          obsTimeout,
          'layouts$ → non-empty array'
        );
        return layouts.includes('grid-responsive');
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    if (!hasGridResponsive) {
      test.skip();
      return;
    }

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;
          const targetLayout = 'grid-responsive';

          await call.setLayout(targetLayout);

          const newLayout = await waitFor(
            call.layout$,
            (l: string) => l === targetLayout,
            obsTimeout,
            'layout$ → grid-responsive'
          );

          return {
            success: true,
            newLayout,
            isGridResponsive: newLayout === targetLayout,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `setLayout grid-responsive — ${result.error ?? ''}`).toBe(true);
    expect(result.isGridResponsive, 'layout is grid-responsive after setLayout').toBe(true);
  });

  test('setLayout with invalid layout throws error', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-layout', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Wait for the call to be fully settled with layouts available
          await waitFor(
            call.layouts$,
            (l: string[]) => Array.isArray(l) && l.length > 0,
            obsTimeout,
            'layouts$ → non-empty array'
          );

          // Attempt to set a nonexistent layout
          try {
            await call.setLayout('nonexistent-layout-xyz');
            return {
              success: false,
              error: 'setLayout did not throw for invalid layout name',
            };
          } catch (setLayoutError) {
            return {
              success: true,
              threwError: true,
              errorMessage: String(setLayoutError),
            };
          }
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `setLayout with invalid name threw error — ${result.error ?? ''}`).toBe(true);
    expect(result.threwError, 'setLayout rejected with an error for invalid layout').toBe(true);
  });

  // NOTE: `setLayout(layout, positions)` (#19400 item 2) is covered by
  // `member-positioning-multi.spec.ts`. Verifying that `positions` is actually
  // honored requires a second participant and a slot the layout truly exposes
  // (the member moving into it is observed via `position$`) — neither possible
  // with a single client. It lives in the multi-client spec rather than being
  // faked here with a non-existent slot like `reserved-0`.
});
