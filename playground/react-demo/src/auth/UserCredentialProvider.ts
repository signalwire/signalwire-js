/**
 * UserCredentialProvider — Custom CredentialProvider for user sign-in.
 *
 * Fetches a Subscriber Access Token (SAT) using reference + password
 * via the Vite middleware proxy. The SDK auto-refreshes before expiry.
 */

import type { AuthenticateContext, CredentialProvider, SDKCredential } from '@signalwire/js';
import { AUTH_METHODS, TOKEN_EXPIRY_MS } from './constants';
import { fetchSubscriberToken, storeToken } from './auth';

interface UserCredentialProviderOptions {
  reference: string;
  password: string;
}

export class UserCredentialProvider implements CredentialProvider {
  #reference: string;
  #password: string;

  constructor({ reference, password }: UserCredentialProviderOptions) {
    this.#reference = reference;
    this.#password = password;
  }

  /**
   * Called once by the SDK during client initialization.
   *
   * When the SDK provides a DPoP fingerprint via context, it is forwarded
   * to the token endpoint to request a Client Bound SAT with automatic refresh.
   */
  async authenticate(context?: AuthenticateContext): Promise<SDKCredential> {
    const expiry_at = Date.now() + TOKEN_EXPIRY_MS;
    const token = await fetchSubscriberToken(this.#reference, this.#password, expiry_at, {
      fingerprint: context?.fingerprint
    });
    storeToken(token, AUTH_METHODS.USER);
    return { token, expiry_at };
  }

  /**
   * Called automatically by the SDK before the current token expires.
   */
  async refresh(): Promise<SDKCredential> {
    return this.authenticate();
  }
}
