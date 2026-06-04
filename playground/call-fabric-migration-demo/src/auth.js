/**
 * Authentication module for Call Fabric Demo
 *
 * Provides low-level auth primitives used by the CredentialProvider implementations:
 *
 * - UserCredentialProvider (./UserCredentialProvider.js)
 *   Uses: fetchSubscriberToken
 *
 * - Token storage helpers (used by all providers and boot flow)
 *   getStoredToken, getStoredAuthMethod, storeToken, clearToken
 */

// ============================================================
// CONSTANTS
// ============================================================

const TOKEN_STORAGE_KEY = 'cf_auth_token';
const METHOD_STORAGE_KEY = 'cf_auth_method';

/** Auth method identifiers */
export const AUTH_METHODS = {
  USER: 'user',
  BUILD_TIME: 'build-time',
};

/** Default token expiry duration (1 hour). Used by CredentialProviders to set expiry_at. */
export const TOKEN_EXPIRY_MS = 3600 * 1000;

// ============================================================
// SUBSCRIBER TOKEN FLOW
// ============================================================

/**
 * Fetch a Subscriber Access Token (SAT) via the Vite middleware proxy.
 *
 * Migration note:
 * Original: POST /subscriber → server calls SignalWire API with Basic auth
 * v4 demo: POST /api/subscriber/token → Vite middleware proxies the request
 *
 * @param {string} reference - Subscriber reference (email)
 * @param {string} password - Subscriber password
 * @param {{ fingerprint?: string }} [options] - Optional DPoP fingerprint for Client Bound SAT
 * @returns {Promise<string>} SAT token
 */
export async function fetchSubscriberToken(reference, password, options = {}) {
  const response = await fetch('/api/subscriber/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference,
      password,
      ...(options.fingerprint && { fingerprint: options.fingerprint }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Subscriber auth failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  return data.token;
}

// ============================================================
// TOKEN STORAGE
// Uses sessionStorage (cleared on tab close, more secure than localStorage)
// ============================================================

/** Get the stored auth token, or null if not authenticated */
export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Get the stored auth method (user, build-time) */
export function getStoredAuthMethod() {
  return sessionStorage.getItem(METHOD_STORAGE_KEY);
}

/** Store the auth token and method */
export function storeToken(token, method) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(METHOD_STORAGE_KEY, method);
}

/** Clear stored auth state (sign out) */
export function clearToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(METHOD_STORAGE_KEY);
}
