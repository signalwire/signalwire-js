/**
 * UserCredentialProvider — Custom CredentialProvider for User sign-in.
 *
 * Implements the CredentialProvider interface from @signalwire/js to
 * encapsulate the user token lifecycle:
 *
 * - authenticate(): Fetches a Subscriber Access Token (SAT) using reference + password.
 * - refresh(): Re-fetches a fresh SAT using the same credentials before expiry.
 *
 * Migration note:
 * The original call-fabric-client-beta used POST /subscriber → Express backend.
 * This provider wraps the same flow into a CredentialProvider so the SDK manages
 * token lifecycle automatically — including scheduled refresh before expiry.
 *
 * @implements {import('@signalwire/js').CredentialProvider}
 */

import { AUTH_METHODS, TOKEN_EXPIRY_MS, fetchSubscriberToken, storeToken } from './auth.js';

export class UserCredentialProvider {
  #reference;
  #password;

  /**
   * @param {Object} options
   * @param {string} options.reference - User reference (e.g. email)
   * @param {string} options.password  - User password
   */
  constructor({ reference, password }) {
    this.#reference = reference;
    this.#password = password;
  }

  /**
   * Called once by the SDK during client initialization.
   * Fetches a fresh SAT via the Vite middleware proxy.
   *
   * When the SDK provides a DPoP fingerprint via context, it is forwarded
   * to the token endpoint to request a Client Bound SAT with automatic refresh.
   *
   * @param {import('@signalwire/js').AuthenticateContext} [context]
   * @returns {Promise<import('@signalwire/js').SDKCredential>}
   */
  async authenticate(context = {}) {
    const token = await fetchSubscriberToken(this.#reference, this.#password, {
      fingerprint: context.fingerprint,
    });
    storeToken(token, AUTH_METHODS.USER);
    return { token, expiry_at: Date.now() + TOKEN_EXPIRY_MS };
  }

  /**
   * Called automatically by the SDK before the current token expires.
   * Re-fetches a fresh SAT using the same credentials.
   *
   * @returns {Promise<import('@signalwire/js').SDKCredential>}
   */
  async refresh() {
    return this.authenticate();
  }
}
