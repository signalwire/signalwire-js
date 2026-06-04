import {
  StaticCredentialProvider,
  EmbedTokenCredentialProvider,
} from '@signalwire/js';

const EMBED_TOKEN_PREFIXES = ['c2c_', 'c2t_'] as const;
export const DEFAULT_EMBED_HOST = 'embeds.signalwire.com';

export function normalizeHost(h: string): string {
  try {
    const url = new URL(h.includes('://') ? h : `https://${h}`);
    return url.hostname;
  } catch {
    return h;
  }
}

export function isEmbedToken(t: string): boolean {
  return EMBED_TOKEN_PREFIXES.some((p) => t.startsWith(p));
}

export function buildCredentialProvider(token: string, host: string) {
  if (isEmbedToken(token)) {
    return new EmbedTokenCredentialProvider(
      normalizeHost(host || DEFAULT_EMBED_HOST),
      token,
    );
  }
  return new StaticCredentialProvider({ token });
}
