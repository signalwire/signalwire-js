import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import type { SignalWireOptions } from '@signalwire/js';
import { createSATToken, getResourceAddresses } from './api';
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

/**
 * Minimal SWML that answers and drops the caller into a video conference.
 *
 * `min_participants: 1` keeps a lone participant's conference alive instead of
 * ending it at zero and re-creating it on the next join, and an empty `wait_url`
 * suppresses hold music for that lone participant.
 */
export function joinConferenceSwml(conferenceName: string): Record<string, unknown> {
  return {
    version: '1.0.0',
    sections: {
      main: [
        { answer: {} },
        {
          join_conference: {
            name: conferenceName,
            video: true,
            min_participants: 1,
            wait_url: '',
          },
        },
      ],
    },
  };
}

interface SetupSwmlConferenceCallOptions {
  page: Page;
  resource: {
    createSWMLApp: (name: string, contents: Record<string, unknown>) => Promise<Resource>;
  };
  prefix: string;
  clientOptions?: SignalWireOptions;
}

/**
 * Setup for tests that need an SWML-backed conference rather than a
 * `conference_rooms` resource.
 *
 * The distinction matters for in-dialog control: the in-dialog transport
 * (`sendCommand`) is only accepted for SWML-backed calls — which is what a
 * `join_conference` SWML gives us, and what production consumers of `sendCommand`
 * actually dial.
 *
 * @returns The conference name (also the resource name)
 */
export async function setupSwmlConferenceCall({
  page,
  resource,
  prefix,
  clientOptions,
}: SetupSwmlConferenceCallOptions): Promise<string> {
  const name = `${prefix}-${roomId()}`;

  const app = await resource.createSWMLApp(name, joinConferenceSwml(name));
  expect(app.id, `SWML app "${name}" created`).toBeTruthy();

  // Ask for the destination rather than assuming a prefix — an SWML script's
  // address is not necessarily public the way a conference room's is.
  const addresses = await getResourceAddresses(app.id);
  const destination = addresses[0]?.channels?.video;
  expect(destination, `SWML app "${name}" exposes a video address`).toBeTruthy();

  const token = await createSATToken();
  expect(token, 'SAT token created').toBeTruthy();

  await gotoTestPage(page);
  await initializeClient(page, token, clientOptions);
  await dialAndJoin(page, destination);
  await waitForConferenceJoin(page);

  return name;
}

/**
 * Wait until the call is a member of the SWML conference, not merely answered.
 *
 * An SWML `join_conference` produces **two** `call.joined` events: the first when
 * the call is answered, before any conference exists, and the second on entering
 * the conference. `dialAndJoin` only waits for `status$ === 'connected'`, which the
 * first one satisfies — for a `conference_rooms` dial the two coincide, which is
 * why no other spec needs this.
 *
 * The first join carries only a minimal capability set, so a control op attempted
 * against it is refused; gating here on the arrival of a self-scoped capability both
 * tells the two joins apart and asserts the grant the caller is about to exercise has
 * actually arrived. `capabilities$` replays its current value, so subscribing after
 * the second join still sees it.
 *
 * Matching the bare `self` root as well as `self.*` leaves is load-bearing: depending
 * on how the conference is configured the grant may arrive as a root (`self`) or as
 * leaves (`self.*`), and a leaf-only predicate would wait out the clock on a call that
 * already joined. The first join carries neither form, so the two are still told apart.
 */
async function waitForConferenceJoin(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    try {
      await window.__waitFor(
        window.__swCall.capabilities$,
        (capabilities: string[] | undefined) =>
          !!capabilities?.some(
            (capability) => capability === 'self' || capability.startsWith('self.')
          ),
        // Comfortably under Playwright's 30s test timeout, so this reports which
        // signal never arrived instead of being cut off by the runner. The join
        // itself lands ~3s after the answer.
        15000,
        'call.capabilities$ → holds a self-scoped grant (conference joined)'
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  if (!result.success) {
    throw new Error(`Setup failed: call never joined the conference — ${result.error}`);
  }
}

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
