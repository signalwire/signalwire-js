import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import type { SignalWireOptions } from '@signalwire/js';
import { createSATToken } from './api';
import type { Resource } from './api';

const TEST_PAGE_URL = 'http://localhost:8765/e2e';

/** Generate a short unique room name suffix. */
export const roomId = () => crypto.randomUUID().slice(0, 8);

/**
 * Navigate to the e2e test page.
 * Call this at the start of every test's Setup phase.
 */
export async function gotoTestPage(page: Page): Promise<void> {
  await page.goto(TEST_PAGE_URL);

  // Wait for the SDK to be loaded and ready
  await page.waitForFunction(
    () => {
      if (window.__sdkLoadError) {
        throw new Error(`SDK failed to load: ${window.__sdkLoadError}`);
      }
      return (
        typeof window.SignalWire === 'function' &&
        typeof window.StaticCredentialProvider === 'function' &&
        typeof window.__waitFor === 'function'
      );
    },
    { timeout: 10000 }
  );
}

/**
 * Initialize a SignalWire client on the page and wait for connection.
 * This is a SETUP helper — use only in the Setup phase.
 *
 * @param options - Optional SignalWire constructor options
 *   (e.g. `{ reconnectAttachedCalls: true }`, `{ skipConnection: true }`)
 */
export async function initializeClient(
  page: Page,
  token: string,
  options?: SignalWireOptions
): Promise<void> {
  const result = await page.evaluate(
    async ({ token, options }) => {
      try {
        const provider = new window.StaticCredentialProvider({ token });
        // Enable verbose logging and WebSocket traffic for all e2e tests
        const client = new window.SignalWire(provider, {
          logLevel: 'debug',
          debug: { logWsTraffic: true },
          ...options,
        });
        window.__swClient = client;

        // If skipConnection is set, don't wait for isConnected$
        if (options?.skipConnection) {
          return { success: true };
        }

        await window.__waitFor(
          client.isConnected$,
          (c) => c === true,
          15000,
          'Client isConnected$'
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
    { token, options }
  );

  if (!result.success) {
    throw new Error(
      `Setup failed: Client initialization error — ${result.error}`
    );
  }
}

/**
 * Dial an address and wait for the call to reach connected status.
 * This is a SETUP helper — use only in the Setup phase.
 * Returns when the call is connected and ready for feature testing.
 */
export async function dialAndJoin(
  page: Page,
  destination: string
): Promise<void> {
  const result = await page.evaluate(async (destination) => {
    try {
      const client = window.__swClient;
      if (!client) throw new Error('Client not initialized');

      const call = await client.dial(destination);
      window.__swCall = call;

      await window.__waitFor(
        call.status$,
        (s) => s === 'connected',
        30000,
        'Call status$'
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, destination);

  if (!result.success) {
    throw new Error(
      `Setup failed: Could not dial "${destination}" — ${result.error}`
    );
  }
}

// ── Composite setup helpers ──────────────────────────────────────────────────

interface SetupRoomCallOptions {
  /** Page instance from Playwright fixture */
  page: Page;
  /** Resource fixture for room creation and auto-cleanup */
  resource: {
    createVideoRoom: (name: string) => Promise<Resource>;
  };
  /** Room name prefix (e.g. 'e2e-part-mute') */
  prefix: string;
  /** Channel query param for the destination (default: 'audio') */
  channel?: 'audio' | 'video';
  /** Optional SignalWire constructor options */
  clientOptions?: SignalWireOptions;
}

/**
 * Full setup for tests that need a connected call in a room.
 *
 * Creates a video room, obtains a SAT token, navigates to the test page,
 * initializes the client, and dials the room. Each step asserts success
 * with a clear message so failures are easy to diagnose:
 *
 * - `'video room "e2e-part-mute-a1b2c3d4" created'`
 * - `'SAT token created'`
 * - `'client connected'` (thrown by initializeClient)
 * - `'call connected to /public/...'` (thrown by dialAndJoin)
 *
 * @returns The generated room name (useful for assertions or logging)
 */
export async function setupRoomCall({
  page,
  resource,
  prefix,
  channel = 'audio',
  clientOptions,
}: SetupRoomCallOptions): Promise<string> {
  const roomName = `${prefix}-${roomId()}`;

  const room = await resource.createVideoRoom(roomName);
  expect(room.id, `video room "${roomName}" created`).toBeTruthy();

  const token = await createSATToken();
  expect(token, 'SAT token created').toBeTruthy();

  await gotoTestPage(page);
  await initializeClient(page, token, clientOptions);
  await dialAndJoin(page, `/public/${roomName}?channel=${channel}`);

  return roomName;
}

/**
 * Setup for tests that need a connected client but handle dialing themselves.
 *
 * Creates a video room, obtains a SAT token, navigates to the test page,
 * and initializes the client. Does NOT dial.
 *
 * Each step asserts success with a clear message:
 * - `'video room "..." created'`
 * - `'SAT token created'`
 * - `'client connected'` (thrown by initializeClient)
 *
 * @returns The generated room name
 */
export async function setupRoomClient({
  page,
  resource,
  prefix,
  clientOptions,
}: Omit<SetupRoomCallOptions, 'channel'>): Promise<string> {
  const roomName = `${prefix}-${roomId()}`;

  const room = await resource.createVideoRoom(roomName);
  expect(room.id, `video room "${roomName}" created`).toBeTruthy();

  const token = await createSATToken();
  expect(token, 'SAT token created').toBeTruthy();

  await gotoTestPage(page);
  await initializeClient(page, token, clientOptions);

  return roomName;
}

/**
 * Setup for tests that only need a connected client (no room).
 *
 * Obtains a SAT token, navigates to the test page, and initializes the client.
 *
 * Each step asserts success with a clear message:
 * - `'SAT token created'`
 * - `'client connected'` (thrown by initializeClient)
 */
export async function setupClient(
  page: Page,
  clientOptions?: SignalWireOptions
): Promise<void> {
  const token = await createSATToken();
  expect(token, 'SAT token created').toBeTruthy();

  await gotoTestPage(page);
  await initializeClient(page, token, clientOptions);
}

/**
 * Subscribe to `client.errors$` and collect emissions into `window.__transportErrors`.
 *
 * Call this after the client is connected but before triggering any network
 * disruptions. The collected errors can be read inside `page.evaluate` via
 * `window.__transportErrors`.
 *
 * Asserts: `'error listener subscribed'`
 */
export async function setupErrorListener(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    try {
      window.__transportErrors = [];
      const sub = window.__swClient.errors$.subscribe((err: unknown) => {
        window.__transportErrors.push(err);
      });
      window.__transportErrorSub = sub;
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  if (!result.success) {
    throw new Error(
      `Setup failed: Error listener subscription — ${result.error}`
    );
  }
}
