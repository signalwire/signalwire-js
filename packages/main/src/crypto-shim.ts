/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * Browser-compatible crypto shim
 *
 * This provides the crypto functions needed by the uuid package
 * using the browser's native Web Crypto API
 */

export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  throw new Error('crypto.randomUUID is not available in this browser');
}

export function randomFillSync(buffer: Uint8Array): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(buffer);
  }
  throw new Error('crypto.getRandomValues is not available in this browser');
}

// Default export for compatibility
export default {
  randomUUID,
  randomFillSync
};
