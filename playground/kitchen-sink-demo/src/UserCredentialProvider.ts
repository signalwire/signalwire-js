/**
 * UserCredentialProvider — Custom CredentialProvider for User sign-in.
 *
 * Implements the CredentialProvider interface from @signalwire/js to
 * encapsulate the user token lifecycle:
 *
 * - authenticate(): Fetches a Subscriber Access Token (SAT) using reference + password.
 * - refresh(): Re-fetches a fresh SAT using the same credentials before expiry.
 */

import type { AuthenticateContext } from '@signalwire/js';
import { AUTH_METHODS, TOKEN_EXPIRY_MS, fetchSubscriberToken, storeToken } from './auth';

export class UserCredentialProvider {
  #reference: string;
  #password: string;

  constructor({ reference, password }: { reference: string; password: string }) {
    this.#reference = reference;
    this.#password = password;
  }

  /**
   * Called by the SDK during client initialization (and when re-minting a
   * base SAT before a client-bound reconnect). Fetches a SAT via the Vite
   * middleware proxy.
   *
   * When the SDK provides a DPoP fingerprint, it is forwarded to the token
   * endpoint to request a Client Bound SAT with sat:refresh scope. The DPoP
   * key pair is persisted in IndexedDB, so the binding — and with it the
   * session — survives page reloads; the SDK then owns token renewal via
   * the Client Bound SAT pipeline instead of the refresh() timer.
   */
  async authenticate(
    context?: AuthenticateContext
  ): Promise<{ token: string; expiry_at: number }> {
    const { token, expiresAt } = await fetchSubscriberToken(this.#reference, this.#password, {
      fingerprint: context?.fingerprint
    });
    storeToken(token, AUTH_METHODS.USER);
    // Report the token's REAL expiry: the SDK arms its proactive refresh timer
    // from expiry_at, so an inflated value would let the token die before the
    // timer fires (and dial/register would fail -32003).
    return { token, expiry_at: expiresAt ?? Date.now() + TOKEN_EXPIRY_MS };
  }

  /**
   * Called automatically by the SDK before the current token expires.
   * Re-fetches a fresh SAT using the same credentials.
   */
  async refresh(): Promise<{ token: string; expiry_at: number }> {
    return this.authenticate();
  }
}