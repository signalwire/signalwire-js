import { DPoPInitError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { DPoPHttpProofParams, DPoPRpcProofParams } from '../core/types/crypto.types';

const logger = getLogger();

const DPOP_DB_NAME = 'sw-dpop';
const DPOP_DB_VERSION = 1;
const DPOP_STORE_NAME = 'keys';
const DPOP_KEY_ID = 'dpop-keypair';

/**
 * Base64url-encodes an ArrayBuffer (no padding, URL-safe).
 */
const base64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Base64url-encodes a UTF-8 string.
 */
const base64urlEncode = (str: string): string => {
  const encoded = new TextEncoder().encode(str);
  return base64url(encoded.buffer);
};

/**
 * Computes the JWK Thumbprint per RFC 7638.
 *
 * Only supports RSA keys — the canonical JSON uses lexicographic member ordering: { e, kty, n }.
 * The thumbprint is SHA-256 of the canonical JSON, base64url-encoded.
 *
 * @throws {Error} If the JWK is not an RSA key.
 */
const computeJwkThumbprint = async (jwk: JsonWebKey): Promise<string> => {
  if (jwk.kty !== 'RSA') {
    throw new Error(`Unsupported key type for JWK Thumbprint: ${jwk.kty}. Only RSA is supported.`);
  }
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return base64url(digest);
};

// ============================================================
// IndexedDB helpers for persisting non-extractable CryptoKeys
// ============================================================

async function openDpopDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DPOP_DB_NAME, DPOP_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DPOP_STORE_NAME)) {
        db.createObjectStore(DPOP_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function loadKeyPairFromDB(): Promise<CryptoKeyPair | null> {
  try {
    const db = await openDpopDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DPOP_STORE_NAME, 'readonly');
      const req = tx.objectStore(DPOP_STORE_NAME).get(DPOP_KEY_ID);
      req.onsuccess = () => resolve((req.result as CryptoKeyPair | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('Failed to load key pair from IndexedDB'));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    logger.warn('[DPoP] Failed to load key pair from IndexedDB:', error);
    return null;
  }
}

async function saveKeyPairToDB(keyPair: CryptoKeyPair): Promise<void> {
  try {
    const db = await openDpopDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DPOP_STORE_NAME, 'readwrite');
      tx.objectStore(DPOP_STORE_NAME).put(keyPair, DPOP_KEY_ID);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to save key pair to IndexedDB'));
      };
    });
  } catch (error) {
    logger.warn('[DPoP] Failed to save key pair to IndexedDB:', error);
  }
}

async function deleteKeyPairFromDB(): Promise<void> {
  try {
    const db = await openDpopDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DPOP_STORE_NAME, 'readwrite');
      tx.objectStore(DPOP_STORE_NAME).delete(DPOP_KEY_ID);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to delete key pair from IndexedDB'));
      };
    });
  } catch (error) {
    logger.warn('[DPoP] Failed to delete key pair from IndexedDB:', error);
  }
}

/**
 * Controls DPoP (Demonstrating Proof-of-Possession) cryptographic operations.
 *
 * Generates an RSA-2048 key pair where the private key is non-extractable,
 * computes the JWK Thumbprint (RFC 7638) as the fingerprint, and creates
 * signed DPoP proof JWTs for both HTTP API requests and WebSocket RPC calls.
 *
 * The key pair is persisted in IndexedDB so the same fingerprint survives
 * page reloads. This keeps the Client Bound SAT and stored authorization_state
 * valid across reloads without needing to re-authenticate.
 *
 * @example
 * ```typescript
 * const crypto = new CryptoController();
 * await crypto.init();
 *
 * // Get fingerprint for SAT issuance
 * const fingerprint = crypto.fingerprint;
 *
 * // Create proof for HTTP endpoint
 * const httpProof = await crypto.createHttpProof({
 *   method: 'POST',
 *   uri: '/api/fabric/subscriber/devices/token'
 * });
 *
 * // Create proof for RPC call
 * const rpcProof = await crypto.createRpcProof({
 *   method: 'signalwire.connect'
 * });
 * ```
 */
export class CryptoController {
  private _keyPair: CryptoKeyPair | null = null;
  private _publicJwk: JsonWebKey | null = null;
  private _fingerprint: string | null = null;
  private _initialized = false;

  /**
   * Initializes the DPoP key pair. Loads an existing key from IndexedDB
   * if available, otherwise generates a new one and persists it.
   *
   * The private key is non-extractable — IndexedDB stores the CryptoKey
   * handle via the structured clone algorithm without exposing key material.
   *
   * @returns The JWK Thumbprint (fingerprint) for the key.
   */
  public async init(): Promise<string> {
    if (this._initialized) {
      return this.fingerprint;
    }

    // Try to restore key pair from IndexedDB (survives page reload)
    const stored = await loadKeyPairFromDB();
    if (stored) {
      try {
        // Verify the stored key is still usable (sign a test payload)
        const testData = new TextEncoder().encode('dpop-key-check');
        await crypto.subtle.sign('RSASSA-PKCS1-v1_5', stored.privateKey, testData);

        this._keyPair = stored;
        this._publicJwk = await crypto.subtle.exportKey('jwk', stored.publicKey);
        this._fingerprint = await computeJwkThumbprint(this._publicJwk);
        this._initialized = true;

        logger.debug('[DPoP] Key pair restored from IndexedDB, fingerprint:', this._fingerprint);
        return this._fingerprint;
      } catch (error) {
        logger.warn('[DPoP] Stored key pair unusable, generating new one:', error);
        await deleteKeyPairFromDB();
      }
    }

    logger.debug('[DPoP] Generating RSA key pair');

    this._keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      false, // Private key is NOT extractable
      ['sign', 'verify']
    );

    this._publicJwk = await crypto.subtle.exportKey('jwk', this._keyPair.publicKey);
    this._fingerprint = await computeJwkThumbprint(this._publicJwk);
    this._initialized = true;

    // Persist to IndexedDB so the same key survives page reload
    await saveKeyPairToDB(this._keyPair);

    logger.debug('[DPoP] Key pair generated and persisted, fingerprint:', this._fingerprint);
    return this._fingerprint;
  }

  /**
   * The JWK Thumbprint (RFC 7638) of the public key.
   * Used as the `fingerprint` parameter when requesting scoped SATs.
   *
   * @throws {DPoPInitError} If {@link init} has not been called.
   */
  public get fingerprint(): string {
    if (!this._fingerprint) {
      throw new DPoPInitError('CryptoController not initialized. Call init() first.');
    }
    return this._fingerprint;
  }

  /**
   * Whether the controller has been initialized with a key pair.
   */
  public get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Creates a DPoP proof JWT for an HTTP API request.
   *
   * Used for Prime API endpoints like `/api/fabric/subscriber/devices/token`
   * and `/api/fabric/subscriber/devices/refresh`.
   *
   * @param params - HTTP method and URI for the proof.
   * @returns Signed DPoP proof JWT string.
   */
  public async createHttpProof(params: DPoPHttpProofParams): Promise<string> {
    const payload: Record<string, unknown> = {
      jti: crypto.randomUUID(),
      htm: params.method,
      htu: params.uri,
      iat: Math.floor(Date.now() / 1000)
    };

    // RFC 9449 Section 4.2: include ath (access token hash) for resource endpoints
    if (params.accessToken) {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(params.accessToken)
      );
      payload.ath = base64url(digest);
    }

    return this.signProof(payload);
  }

  /**
   * Creates a DPoP proof JWT for a WebSocket RPC call.
   *
   * Used for switchblade RPC methods like `signalwire.connect` and
   * `signalwire.reauthenticate`.
   *
   * @param params - RPC method name for the proof.
   * @returns Signed DPoP proof JWT string.
   */
  public async createRpcProof(params: DPoPRpcProofParams): Promise<string> {
    const payload = {
      jti: crypto.randomUUID(),
      rpc: 'request' as const,
      mth: params.method,
      iat: Math.floor(Date.now() / 1000)
    };

    return this.signProof(payload);
  }

  /**
   * Releases the key pair references and removes the persisted key from IndexedDB.
   * After calling destroy, the controller must be re-initialized to be used again.
   */
  public destroy(): void {
    this._keyPair = null;
    this._publicJwk = null;
    this._fingerprint = null;
    this._initialized = false;
    // Fire-and-forget — IndexedDB cleanup is best-effort
    void deleteKeyPairFromDB();
    logger.debug('[DPoP] Controller destroyed');
  }

  private get publicJwk(): JsonWebKey {
    if (!this._publicJwk) {
      throw new DPoPInitError('CryptoController not initialized. Call init() first.');
    }
    return this._publicJwk;
  }

  private get privateKey(): CryptoKey {
    if (!this._keyPair) {
      throw new DPoPInitError('CryptoController not initialized. Call init() first.');
    }
    return this._keyPair.privateKey;
  }

  private async signProof(payload: Record<string, unknown>): Promise<string> {
    const header = {
      typ: 'dpop+jwt' as const,
      alg: 'RS256' as const,
      jwk: this.publicJwk
    };

    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      this.privateKey,
      new TextEncoder().encode(signingInput)
    );

    return `${signingInput}.${base64url(signature)}`;
  }
}
