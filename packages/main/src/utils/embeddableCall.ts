import { first } from 'rxjs';

import { SignalWire } from '../clients/SignalWire';
import { DependencyError } from '../core/errors';
import { EmbedTokenCredentialProvider } from '../dependencies/EmbedTokenCredentialProvider';

import type { Call } from '../core/entities/types/call.types';

/** Options for {@link embeddableCall}. */
export interface EmbeddableCallOptions {
  /** Destination URI to call. */
  to: string;
  /** Embed token for authentication. */
  embedToken: string;
  /** SignalWire host URL. */
  host: string;
}

/**
 * Creates a call using an embed token for simple, embeddable integrations.
 *
 * Handles client creation, authentication, and dialing in a single call.
 *
 * @param options - Embed token, host, and destination.
 * @returns The created {@link Call} instance.
 */
export async function embeddableCall(options: EmbeddableCallOptions): Promise<Call> {
  const { to, embedToken, host } = options;
  const requiredFailed = [];

  if (!to) {
    requiredFailed.push('to');
  }

  if (!embedToken) {
    requiredFailed.push('embedToken');
  }

  if (!host) {
    requiredFailed.push('host');
  }

  if (requiredFailed.length > 0) {
    return Promise.reject(
      new DependencyError(`Missing required options: ${requiredFailed.join(', ')}`)
    );
  }

  const credentialProvider = new EmbedTokenCredentialProvider(host, embedToken);
  const client = new SignalWire(credentialProvider);

  const call = await client.dial(to);

  // Destroy the client when the call ends to clean up WebSocket, timers, and session
  call.status$.pipe(first((status) => status === 'destroyed')).subscribe(() => {
    void client.disconnect();
  });

  return call;
}
