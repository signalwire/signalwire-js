/**
 * Authentication utilities for the React demo.
 *
 * Provides token storage and subscriber token flow.
 */

import { TOKEN_STORAGE_KEY, METHOD_STORAGE_KEY } from './constants';
import type { AuthMethod } from './constants';

// ============================================================
// Subscriber token flow
// ============================================================

/**
 * Fetch a Subscriber Access Token (SAT) via the Vite middleware proxy.
 */
export async function fetchSubscriberToken(
  reference: string,
  password: string,
  expiry_at: number,
  options?: { fingerprint?: string }
): Promise<string> {
  const response = await fetch('/api/subscriber/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference,
      password,
      expire_at: Math.floor(expiry_at / 1000),
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
// Token storage (sessionStorage — cleared on tab close)
// ============================================================

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredAuthMethod(): string | null {
  return sessionStorage.getItem(METHOD_STORAGE_KEY);
}

export function storeToken(token: string, method: AuthMethod): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(METHOD_STORAGE_KEY, method);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(METHOD_STORAGE_KEY);
}
