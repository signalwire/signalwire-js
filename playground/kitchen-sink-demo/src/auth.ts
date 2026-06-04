/**
 * Authentication module for Kitchen Sink Demo
 *
 * Provides low-level auth primitives used by the CredentialProvider implementations:
 *
 * - UserCredentialProvider (./UserCredentialProvider.ts)
 *   Uses: fetchSubscriberToken
 *
 * - Token storage helpers (used by all providers and boot flow)
 *   getStoredToken, getStoredAuthMethod, storeToken, clearToken
 */

// ============================================================
// CONSTANTS
// ============================================================

const TOKEN_STORAGE_KEY = 'ks_auth_token';
const METHOD_STORAGE_KEY = 'ks_auth_method';
const PERSIST_TOKEN_KEY = 'ks_persist_token';
const PERSIST_METHOD_KEY = 'ks_persist_method';
const LAST_DESTINATION_KEY = 'ks_last_destination';
const AUTO_CONNECT_KEY = 'ks_auto_connect';
const AUTO_DIAL_KEY = 'ks_auto_dial';

/** Auth method identifiers */
export const AUTH_METHODS = {
  USER: 'user',
  BUILD_TIME: 'build-time'
} as const;

export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];

/** Default token expiry duration (1 hour). Used by CredentialProviders to set expiry_at. */
export const TOKEN_EXPIRY_MS = 3600 * 1000;

// ============================================================
// USER TOKEN FLOW
// ============================================================

/**
 * Fetch a Subscriber Access Token (SAT) via the Vite middleware proxy.
 *
 * @param reference - Subscriber reference (email)
 * @param password - Subscriber password
 * @param options - Optional parameters (e.g., DPoP fingerprint for Client Bound SAT)
 * @returns SAT token string
 */
export async function fetchSubscriberToken(
  reference: string,
  password: string,
  options?: { fingerprint?: string }
): Promise<string> {
  const base = import.meta.env.BASE_URL ?? '/';
  const response = await fetch(`${base}api/subscriber/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference,
      password,
      ...(options?.fingerprint && { fingerprint: options.fingerprint })
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Subscriber auth failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  return data.token;
}

// ============================================================
// TOKEN STORAGE (sessionStorage - cleared on tab close)
// ============================================================

/** Get the stored auth token, or null if not authenticated */
export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Get the stored auth method */
export function getStoredAuthMethod(): string | null {
  return sessionStorage.getItem(METHOD_STORAGE_KEY);
}

/** Store the auth token and method */
export function storeToken(token: string, method: AuthMethod): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(METHOD_STORAGE_KEY, method);
}

/** Clear stored auth state (sign out) */
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(METHOD_STORAGE_KEY);
}

// ============================================================
// PERSISTENT STORAGE (localStorage - survives reload/tab close)
// Used for "Remember me" feature to support reattach testing.
// ============================================================

/** Persist token to localStorage so it survives page reload. */
export function persistToken(token: string, method: AuthMethod): void {
  localStorage.setItem(PERSIST_TOKEN_KEY, token);
  localStorage.setItem(PERSIST_METHOD_KEY, method);
}

/** Get the persisted token from localStorage, or null. */
export function getPersistedToken(): string | null {
  return localStorage.getItem(PERSIST_TOKEN_KEY);
}

/** Get the persisted auth method from localStorage, or null. */
export function getPersistedAuthMethod(): string | null {
  return localStorage.getItem(PERSIST_METHOD_KEY);
}

/** Clear persisted token from localStorage. */
export function clearPersistedToken(): void {
  localStorage.removeItem(PERSIST_TOKEN_KEY);
  localStorage.removeItem(PERSIST_METHOD_KEY);
}

/** Store the last dialed destination so it auto-fills on reload. */
export function storeLastDestination(destination: string): void {
  localStorage.setItem(LAST_DESTINATION_KEY, destination);
}

/** Get the last dialed destination, or null. */
export function getLastDestination(): string | null {
  return localStorage.getItem(LAST_DESTINATION_KEY);
}

/** Clear the last destination. */
export function clearLastDestination(): void {
  localStorage.removeItem(LAST_DESTINATION_KEY);
}

/** Set whether to auto-connect on reload. */
export function setAutoConnect(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(AUTO_CONNECT_KEY, 'true');
  } else {
    localStorage.removeItem(AUTO_CONNECT_KEY);
  }
}

/** Check if auto-connect is enabled. */
export function getAutoConnect(): boolean {
  return localStorage.getItem(AUTO_CONNECT_KEY) === 'true';
}

/** Set whether to auto-dial last destination on reload (requires auto-connect). */
export function setAutoDial(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(AUTO_DIAL_KEY, 'true');
  } else {
    localStorage.removeItem(AUTO_DIAL_KEY);
  }
}

/** Check if auto-dial is enabled. */
export function getAutoDial(): boolean {
  return localStorage.getItem(AUTO_DIAL_KEY) === 'true';
}

/** Clear all persisted state (token, destination, auto-connect, auto-dial). */
export function clearAllPersisted(): void {
  clearPersistedToken();
  clearLastDestination();
  setAutoConnect(false);
  setAutoDial(false);
}
