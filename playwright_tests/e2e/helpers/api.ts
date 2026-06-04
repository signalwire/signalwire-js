/**
 * SignalWire API helpers for e2e tests.
 *
 * Centralizes all API configuration, credential validation, and
 * HTTP requests to the SignalWire management API. Every function
 * here runs in Node (Playwright test process), not in the browser.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// ── Load .env ────────────────────────────────────────────────
config({ path: resolve(import.meta.dirname, '../../../.env') });

// ── Required env vars ────────────────────────────────────────
const REQUIRED_ENV = [
  'SW_SPACE',
  'SW_DOMAIN',
  'SW_PROJECT_ID',
  'SW_API_TOKEN',
  'SW_SUBSCRIBER_REFERENCE',
  'SW_SUBSCRIBER_PASSWORD',
] as const;

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `E2E tests require these environment variables (set in .env):\n  ${missing.join('\n  ')}`
  );
}

// ── Derived config ───────────────────────────────────────────
const API_HOST = `${process.env.SW_SPACE}.${process.env.SW_DOMAIN}`;

const BASIC_TOKEN = Buffer.from(
  `${process.env.SW_PROJECT_ID}:${process.env.SW_API_TOKEN}`
).toString('base64');

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Basic ${BASIC_TOKEN}`,
};

// ── Types ────────────────────────────────────────────────────

export interface Resource {
  id: string;
  name?: string;
  type?: string;
}

// ── API Functions ────────────────────────────────────────────

/**
 * Request a fresh Subscriber Access Token (SAT).
 * Mirrors the logic in `scripts/issue-sat.js`.
 *
 * @param options - Optional parameters for DPoP Client Bound SAT
 * @param options.fingerprint - JWK Thumbprint to bind the SAT to a DPoP key pair
 * @param options.scope - Request a specific scope (e.g., 'sat:refresh') without fingerprint binding
 * @param options.expire_at - Unix timestamp (seconds) for token expiry
 */
export async function createSATToken(options?: {
  fingerprint?: string;
  scope?: string;
  expire_at?: number;
}): Promise<string> {
  const response = await fetch(
    `https://${API_HOST}/api/fabric/subscribers/tokens`,
    {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        reference: process.env.SW_SUBSCRIBER_REFERENCE,
        password: process.env.SW_SUBSCRIBER_PASSWORD,
        ...(process.env.SW_APPLICATION_ID && {
          application_id: process.env.SW_APPLICATION_ID,
        }),
        // DPoP: when fingerprint is provided, request a Client Bound SAT
        ...(options?.fingerprint && { fingerprint: options.fingerprint }),
        // Scope: sat:refresh (auto-set with fingerprint, or explicit)
        ...((options?.fingerprint || options?.scope) && { scope: options?.scope ?? 'sat:refresh' }),
        // Short expiry for testing refresh cycles
        ...(options?.expire_at && { expire_at: options.expire_at }),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create SAT token: ${response.status} ${response.statusText} — ${body}`
    );
  }

  const data = await response.json();
  return data.token;
}

/** Create a video room resource. */
export async function createVideoRoomResource(
  name: string
): Promise<Resource> {
  const response = await fetch(
    `https://${API_HOST}/api/fabric/resources/conference_rooms`,
    {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ name }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create video room "${name}": ${response.status} ${response.statusText} — ${body}`
    );
  }

  return response.json();
}

/** Create a SWML script resource. */
export async function createSWMLAppResource(
  name: string,
  contents: Record<string, unknown>
): Promise<Resource> {
  const response = await fetch(
    `https://${API_HOST}/api/fabric/resources/swml_scripts`,
    {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        name,
        contents: JSON.stringify(contents),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create SWML app "${name}": ${response.status} ${response.statusText} — ${body}`
    );
  }

  return response.json();
}

/** Delete a resource by ID. Swallows errors (cleanup best-effort). */
export async function deleteResource(id: string): Promise<void> {
  try {
    const response = await fetch(`https://${API_HOST}/api/fabric/resources/${id}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    if (!response.ok) {
      console.warn(`Warning: DELETE resource ${id} returned ${response.status}`);
    }
  } catch (error) {
    console.error(`Warning: Failed to delete resource ${id}:`, error);
  }
}
