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
   * Called once by the SDK during client initialization.
   * Fetches a SAT via the Vite middleware proxy.
   *
   * When the SDK provides a DPoP fingerprint, it is forwarded to the token
   * endpoint to request a Client Bound SAT with sat:refresh scope. The DPoP
   * key pair is persisted in IndexedDB so the same fingerprint survives page
   * reload, keeping the SAT valid and refresh working.
   */
  async authenticate(
    _context?: AuthenticateContext
  ): Promise<{ token: string; expiry_at: number }> {
    // Don't pass DPoP fingerprint — get a plain SAT (no cnf.jkt).
    // Plain SATs work for login, reconnect, and reattach on reload.
    // The SDK's credentialProvider.refresh() timer handles token renewal.
    const token = await fetchSubscriberToken(this.#reference, this.#password);
    storeToken(token, AUTH_METHODS.USER);
    return { token, expiry_at: Date.now() + TOKEN_EXPIRY_MS };
  }

  /**
   * Called automatically by the SDK before the current token expires.
   * Re-fetches a fresh SAT using the same credentials.
   */
  async refresh(): Promise<{ token: string; expiry_at: number }> {
    return this.authenticate();
  }
}
