import type { CredentialProvider } from './interfaces';
import type { SDKCredential } from '../core/types/common.types';

/**
 * Credential provider that returns a fixed set of credentials.
 *
 * Use when the token is already available (e.g. from a backend endpoint).
 *
 * @example
 * ```ts
 * const provider = new StaticCredentialProvider({ token: 'my-sat-token' });
 * const client = new SignalWire(provider);
 * ```
 */
export class StaticCredentialProvider implements CredentialProvider {
  constructor(private credentials: SDKCredential) {}

  /** Returns the static credentials. */
  public async authenticate(): Promise<SDKCredential> {
    return Promise.resolve(this.credentials);
  }
}
