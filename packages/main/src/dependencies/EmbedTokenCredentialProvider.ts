import { RequestError, RequestTimeoutError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { CredentialProvider } from './interfaces';

const logger = getLogger();

/** Credential provider that exchanges an embed token for a SAT via the host's token endpoint. */
export class EmbedTokenCredentialProvider implements CredentialProvider {
  constructor(
    private host: string,
    private embedToken: string
  ) {}

  private async fetchSAT(): Promise<string> {
    const url = `https://${this.host}/api/fabric/embeds/tokens`;

    const timeout = 10000; // 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.embedToken }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { token: string };
        return data.token;
      }

      throw new RequestError(
        `Failed to fetch SAT using embed token: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutError(`Request timeout after ${timeout}ms`, { cause: error });
      }

      logger.error('[EmbedCredentialProvider] Request failed:', error);
      throw error;
    }
  }

  public async authenticate(): Promise<{ token: string; expiry_at: number }> {
    const sat = await this.fetchSAT();
    const expiryAt = Date.now() + 3600 * 1000;
    return { token: sat, expiry_at: expiryAt };
  }

  public async refresh(): Promise<{ token: string; expiry_at: number }> {
    return this.authenticate();
  }
}
