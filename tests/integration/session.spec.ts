// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { SignalWire } from '../../src/clients/SignalWire';
import { firstValueFrom, filter, take, timeout } from 'rxjs';
import { InMemoryStorage } from '../mocks/InMemoryStorage';
import { WebSocket } from 'ws';
import { loadEnv } from '../utils/loadEnv';

// Load environment variables before tests
loadEnv();

interface SubscriberTokenResponse {
  token: string;
  refresh_token: string;
  expires_at: number;
}

describe('Session E2E Test', () => {
  beforeAll(async () => {
    // Validate required environment variables
    const requiredEnvVars = [
      'SW_SPACE',
      'SW_SUBSCRIBER_REFERENCE',
      'SW_PROJECT_ID',
      'SW_PROJECT_TOKEN',
    ];

    // If not using existing token, password is also required
    if (!process.env.SW_EXISTING_SUBSCRIBER_TOKEN) {
      requiredEnvVars.push('SW_SUBSCRIBER_REFERENCE_PASSWORD');
    }

    const missing = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  });

  it('should complete full subscriber session lifecycle', async () => {
    let client: SignalWire | null = null;

    try {
      // Step 1: Create or retrieve subscriber token
      console.log('\n=== Step 1: Token Creation ===');
      const subscriberToken = await createOrRetrieveSubscriberToken();
      expect(subscriberToken).toBeDefined();
      expect(typeof subscriberToken).toBe('string');
      expect(subscriberToken.length).toBeGreaterThan(0);

      // Step 2: Create and initialize client
      console.log('\n=== Step 2: Client Initialization ===');
      client = createSignalWire(subscriberToken);
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SignalWire);

      // Step 3: Verify user initialization
      console.log('\n=== Step 3: User Initialization ===');
      await verifyUserInitialized(client);

      // Step 4: Verify transport connection
      console.log('\n=== Step 4: Transport Connection ===');
      await verifyTransportConnected(client);

      // Step 5: Verify session authentication
      console.log('\n=== Step 5: Session Authentication ===');
      await verifySessionAuthenticated(client);

      // Step 6: Verify auth state persisted
      console.log('\n=== Step 6: Auth State Persistence ===');
      await verifyAuthStateSaved(client);

      // Step 7: Verify protocol saved
      console.log('\n=== Step 7: Protocol Persistence ===');
      await verifyProtocolSaved(client);

      // Step 8: Verify ping/pong and disconnect
      console.log('\n=== Step 8: Ping Handling & Disconnect ===');
      await verifyPingAndDisconnect(client);

      console.log('\n=== Session Lifecycle Test Complete ===');
    } finally {
      // Ensure cleanup happens even if test fails
      if (client) {
        await cleanupClient(client);
      }
    }
  }, 60000); // Single timeout for entire workflow
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a new subscriber token via API or retrieves existing token from env
 */
async function createOrRetrieveSubscriberToken(): Promise<string> {
  const existingToken = process.env.SW_EXISTING_SUBSCRIBER_TOKEN;

  if (existingToken && existingToken.length > 0) {
    console.log('Using existing subscriber token from SW_EXISTING_SUBSCRIBER_TOKEN');
    return existingToken;
  }

  // Create new token via API
  const space = process.env.SW_SPACE!;
  const subscriberReference = process.env.SW_SUBSCRIBER_REFERENCE!;
  const subscriberPassword = process.env.SW_SUBSCRIBER_REFERENCE_PASSWORD!;
  const projectId = process.env.SW_PROJECT_ID!;
  const projectToken = process.env.SW_PROJECT_TOKEN!;

  const authString = `${projectId}:${projectToken}`;
  const base64Auth = Buffer.from(authString).toString('base64');

  const requestBody = {
    reference: subscriberReference,
    password: subscriberPassword,
  };

  console.log('Creating new subscriber token...');
  console.log('Request URL:', `https://${space}.signalwire.com/api/fabric/subscribers/tokens`);

  const response = await fetch(
    `https://${space}.signalwire.com/api/fabric/subscribers/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${base64Auth}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(
      `Failed to create subscriber token: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as SubscriberTokenResponse;
  console.log('Token created successfully');

  return data.token;
}

/**
 * Creates a new SignalWire instance
 */
function createSignalWire(token: string): SignalWire {
  console.log('Creating SignalWire...');

  const client = new SignalWire(
    { token },
    {
      skipConnection: false,
      storageImplementation: new InMemoryStorage(),
      webSocketConstructor: WebSocket as any,
    }
  );

  console.log('SignalWire created');
  return client;
}

/**
 * Verifies that the user is properly initialized
 */
async function verifyUserInitialized(client: SignalWire): Promise<void> {
  console.log('Waiting for user to be fetched...');

  // Wait for user$ to emit a defined User instance
  const user = await firstValueFrom(
    client.user$.pipe(
      filter((u) => u !== undefined),
      take(1),
      timeout(15000)
    )
  );

  expect(user).toBeDefined();
  expect(user!.id).toBeDefined();
  expect(user!.email).toBeDefined();

  console.log(`User initialized: ${user!.email} (ID: ${user!.id})`);
}

/**
 * Verifies that the transport is connected
 */
async function verifyTransportConnected(client: SignalWire): Promise<void> {
  const transport = (client as any)._transport;
  expect(transport).toBeDefined();

  console.log('Waiting for transport connection...');

  // Wait for connection status to be 'connected'
  const connectionStatus = await firstValueFrom(
    transport.connectionStatus$.pipe(
      filter((status: string) => status === 'connected'),
      take(1),
      timeout(15000)
    )
  );

  expect(connectionStatus).toBe('connected');
  console.log('Transport connected successfully');
}

/**
 * Verifies that the session is authenticated
 */
async function verifySessionAuthenticated(client: SignalWire): Promise<void> {
  const session = (client as any)._session;
  expect(session).toBeDefined();

  console.log('Waiting for session authentication...');

  // Subscribe to errors for debugging
  const errorSubscription = session.errors$.subscribe((error: Error) => {
    console.error('[Session Error]:', error.message);
  });

  try {
    // Wait for authentication
    const authenticated = await firstValueFrom(
      session.authenticated$.pipe(
        filter((auth: boolean) => auth === true),
        take(1),
        timeout(15000)
      )
    );

    expect(authenticated).toBe(true);
    console.log('Session authenticated successfully');
  } finally {
    errorSubscription.unsubscribe();
  }
}

/**
 * Verifies that the auth state is saved
 */
async function verifyAuthStateSaved(client: SignalWire): Promise<void> {
  const session = (client as any)._session;

  console.log('Checking auth state persistence...');

  // Get the current auth state from the session's private observable
  const authState = await firstValueFrom<string>(
    (session as any).authorizationState$.pipe(
      filter((state: string) => state !== undefined && state.length > 0),
      take(1),
      timeout(10000)
    )
  );

  expect(authState).toBeDefined();
  expect(typeof authState).toBe('string');
  expect(authState.length).toBeGreaterThan(0);

  console.log(`Auth state saved (length: ${authState.length})`);
}

/**
 * Verifies that the protocol is saved
 */
async function verifyProtocolSaved(client: SignalWire): Promise<void> {
  const transport = (client as any)._transport;

  console.log('Checking protocol persistence...');

  // Get the protocol from transport
  const protocol = await firstValueFrom<string>(
    transport.protocol$.pipe(
      filter((p: string | undefined) => p !== undefined && p.length > 0),
      take(1),
      timeout(10000)
    )
  );

  expect(protocol).toBeDefined();
  expect(typeof protocol).toBe('string');
  expect(protocol.length).toBeGreaterThan(0);

  console.log(`Protocol saved: ${protocol}`);
}

/**
 * Verifies ping message reception and performs graceful disconnect
 */
async function verifyPingAndDisconnect(client: SignalWire): Promise<void> {
  const transport = (client as any)._transport;

  console.log('Waiting for ping message (timeout: 30s)...');

  // Wait for a ping message
  const pingReceived = await waitForPingMessage(transport);
  expect(pingReceived).toBe(true);
  console.log('Ping message received');

  // Disconnect
  console.log('Disconnecting client...');
  await client.disconnect();

  // Verify disconnection
  const connectionStatus = await firstValueFrom(
    transport.connectionStatus$.pipe(
      filter((status: string) => status === 'disconnected'),
      take(1),
      timeout(5000)
    )
  );

  expect(connectionStatus).toBe('disconnected');
  console.log('Client disconnected successfully');
}

/**
 * Waits for a ping message from SignalWire
 */
async function waitForPingMessage(transport: any): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const subscription = transport.parsedMessages$.subscribe((message: any) => {
      // Check if this is a ping message
      if (
        message &&
        (message.method === 'signalwire.ping' || message.method === 'blade.ping')
      ) {
        subscription.unsubscribe();
        resolve(true);
      }
    });

    // Timeout after 30 seconds (pings are usually sent every 5-10 seconds)
    setTimeout(() => {
      subscription.unsubscribe();
      resolve(false);
    }, 30000);
  });
}

/**
 * Cleans up client resources
 */
async function cleanupClient(client: SignalWire): Promise<void> {
  try {
    console.log('\nCleaning up client resources...');
    await client.disconnect();
    client.destroy();
    console.log('Cleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
    // Don't throw - cleanup errors shouldn't fail the test
  }
}
