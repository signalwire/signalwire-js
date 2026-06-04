/**
 * Room Lock/Unlock — E2E Test Suite
 *
 * Tests the room lock and unlock feature via `call.toggleLock()`.
 * Verifies that `call.locked$` observable and `call.locked` sync getter
 * correctly reflect the room lock state throughout the lock/unlock lifecycle.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Room Lock/Unlock', () => {
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

  test('locked$ initial state is false', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-lock', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const locked = await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (initial)'
          );

          return {
            success: true,
            locked,
            lockedSync: call.locked,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'locked$ emitted initial value').toBe(true);
    expect(result.locked, 'locked$ initial value is false').toBe(false);
    expect(result.lockedSync, 'call.locked sync getter is false').toBe(false);
  });

  test('toggleLock locks the room', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-lock', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Ensure we start unlocked
          await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (before lock)'
          );

          // Lock the room
          await call.toggleLock();

          const locked = await waitFor(
            call.locked$,
            (v) => v === true,
            obsTimeout,
            'locked$ → true (after toggleLock)'
          );

          return {
            success: true,
            locked,
            lockedSync: call.locked,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `toggleLock() succeeded — ${result.error ?? ''}`).toBe(true);
    expect(result.locked, 'locked$ emitted true after toggleLock').toBe(true);
    expect(result.lockedSync, 'call.locked sync getter is true').toBe(true);
  });

  test('toggleLock again unlocks the room', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-lock', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Lock the room first
          await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (initial)'
          );

          await call.toggleLock();

          await waitFor(
            call.locked$,
            (v) => v === true,
            obsTimeout,
            'locked$ → true (after first toggleLock)'
          );

          // Unlock the room
          await call.toggleLock();

          const locked = await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (after second toggleLock)'
          );

          return {
            success: true,
            locked,
            lockedSync: call.locked,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'double toggleLock() succeeded').toBe(true);
    expect(result.locked, 'locked$ emitted false after second toggleLock').toBe(false);
    expect(result.lockedSync, 'call.locked sync getter is false').toBe(false);
  });

  test('lock/unlock full cycle', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-lock', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Step 1: Verify initial unlocked state
          const initialLocked = await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (initial)'
          );

          // Step 2: Lock the room
          await call.toggleLock();
          const afterLock = await waitFor(
            call.locked$,
            (v) => v === true,
            obsTimeout,
            'locked$ → true (after lock)'
          );
          const afterLockSync = call.locked;

          // Step 3: Unlock the room
          await call.toggleLock();
          const afterUnlock = await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (after unlock)'
          );
          const afterUnlockSync = call.locked;

          return {
            success: true,
            initialLocked,
            afterLock,
            afterLockSync,
            afterUnlock,
            afterUnlockSync,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'full lock/unlock cycle completed').toBe(true);
    expect(result.initialLocked, 'room starts unlocked').toBe(false);
    expect(result.afterLock, 'locked$ is true after locking').toBe(true);
    expect(result.afterLockSync, 'call.locked is true after locking').toBe(true);
    expect(result.afterUnlock, 'locked$ is false after unlocking').toBe(false);
    expect(result.afterUnlockSync, 'call.locked is false after unlocking').toBe(false);
  });

  test('locked state persists through the call', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-lock', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // Lock the room
          await waitFor(
            call.locked$,
            (v) => v === false,
            obsTimeout,
            'locked$ → false (initial)'
          );

          await call.toggleLock();

          await waitFor(
            call.locked$,
            (v) => v === true,
            obsTimeout,
            'locked$ → true (after lock)'
          );

          // Wait 2 seconds and verify the lock state persists
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const lockedAfterDelay = call.locked;

          // Also verify via observable
          const lockedObsAfterDelay = await waitFor(
            call.locked$,
            (v) => v === true,
            obsTimeout,
            'locked$ → still true (after delay)'
          );

          return {
            success: true,
            lockedAfterDelay,
            lockedObsAfterDelay,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'lock persistence check completed').toBe(true);
    expect(result.lockedAfterDelay, 'call.locked is still true after 2s delay').toBe(true);
    expect(result.lockedObsAfterDelay, 'locked$ still emits true after 2s delay').toBe(true);
  });
});
