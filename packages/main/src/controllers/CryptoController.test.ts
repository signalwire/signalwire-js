import { describe, it, expect, beforeEach } from 'vitest';

import { CryptoController } from './CryptoController';
import { DPoPInitError } from '../core/errors';

/**
 * Decodes a base64url-encoded string to a UTF-8 string.
 */
const base64urlDecode = (str: string): string => {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
};

/**
 * Parses a JWT string into its header and payload components.
 */
const parseJwt = (
  jwt: string
): { header: Record<string, unknown>; payload: Record<string, unknown> } => {
  const [headerB64, payloadB64] = jwt.split('.');
  return {
    header: JSON.parse(base64urlDecode(headerB64)),
    payload: JSON.parse(base64urlDecode(payloadB64))
  };
};

/**
 * Checks whether a string is valid base64url (no padding, URL-safe alphabet).
 */
const isValidBase64url = (str: string): boolean => /^[A-Za-z0-9_-]+$/.test(str);

describe('CryptoController', () => {
  let controller: CryptoController;

  beforeEach(() => {
    controller = new CryptoController();
  });

  describe('init()', () => {
    it('generates a key pair and returns a fingerprint', async () => {
      const fingerprint = await controller.init();

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
      expect(controller.initialized).toBe(true);
    });

    it('returns the same fingerprint on second call (idempotent)', async () => {
      const first = await controller.init();
      const second = await controller.init();

      expect(first).toBe(second);
    });
  });

  describe('fingerprint getter', () => {
    it('throws if not initialized', () => {
      expect(() => controller.fingerprint).toThrow(DPoPInitError);
    });

    it('returns a valid base64url string (RFC 7638 JWK Thumbprint)', async () => {
      await controller.init();

      const fingerprint = controller.fingerprint;

      expect(isValidBase64url(fingerprint)).toBe(true);
      // SHA-256 digest is 32 bytes; base64url of 32 bytes is 43 characters
      expect(fingerprint.length).toBe(43);
    });
  });

  describe('createHttpProof()', () => {
    it('throws if not initialized', async () => {
      await expect(
        controller.createHttpProof({ method: 'POST', uri: '/api/test' })
      ).rejects.toThrow(DPoPInitError);
    });

    it('returns a valid JWT with correct header structure', async () => {
      await controller.init();

      const proof = await controller.createHttpProof({
        method: 'POST',
        uri: '/api/fabric/subscriber/devices/token'
      });

      const parts = proof.split('.');
      expect(parts).toHaveLength(3);

      const { header } = parseJwt(proof);
      expect(header.typ).toBe('dpop+jwt');
      expect(header.alg).toBe('RS256');
      expect(header.jwk).toBeDefined();
      expect((header.jwk as JsonWebKey).kty).toBe('RSA');
    });

    it('returns a valid JWT with correct payload fields', async () => {
      await controller.init();

      const proof = await controller.createHttpProof({
        method: 'POST',
        uri: '/api/fabric/subscriber/devices/token'
      });

      const { payload } = parseJwt(proof);
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
      expect(payload.htm).toBe('POST');
      expect(payload.htu).toBe('/api/fabric/subscriber/devices/token');
      expect(typeof payload.iat).toBe('number');
      expect(payload.iat).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
    });

    it('contains the correct method and uri values', async () => {
      await controller.init();

      const proof = await controller.createHttpProof({
        method: 'GET',
        uri: '/custom/endpoint'
      });

      const { payload } = parseJwt(proof);
      expect(payload.htm).toBe('GET');
      expect(payload.htu).toBe('/custom/endpoint');
    });
  });

  describe('createRpcProof()', () => {
    it('throws if not initialized', async () => {
      await expect(controller.createRpcProof({ method: 'signalwire.connect' })).rejects.toThrow(
        DPoPInitError
      );
    });

    it('returns a valid JWT with correct header structure', async () => {
      await controller.init();

      const proof = await controller.createRpcProof({ method: 'signalwire.connect' });

      const parts = proof.split('.');
      expect(parts).toHaveLength(3);

      const { header } = parseJwt(proof);
      expect(header.typ).toBe('dpop+jwt');
      expect(header.alg).toBe('RS256');
      expect(header.jwk).toBeDefined();
      expect((header.jwk as JsonWebKey).kty).toBe('RSA');
    });

    it('returns a valid JWT with correct payload fields', async () => {
      await controller.init();

      const proof = await controller.createRpcProof({ method: 'signalwire.connect' });

      const { payload } = parseJwt(proof);
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
      expect(payload.rpc).toBe('request');
      expect(payload.mth).toBe('signalwire.connect');
      expect(typeof payload.iat).toBe('number');
      expect(payload.iat).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
    });

    it('contains the correct method value', async () => {
      await controller.init();

      const proof = await controller.createRpcProof({ method: 'signalwire.reauthenticate' });

      const { payload } = parseJwt(proof);
      expect(payload.mth).toBe('signalwire.reauthenticate');
    });
  });

  describe('unique jti', () => {
    it('generates a unique jti for each proof', async () => {
      await controller.init();

      const proof1 = await controller.createHttpProof({ method: 'POST', uri: '/a' });
      const proof2 = await controller.createHttpProof({ method: 'POST', uri: '/a' });
      const proof3 = await controller.createRpcProof({ method: 'signalwire.connect' });

      const jti1 = parseJwt(proof1).payload.jti;
      const jti2 = parseJwt(proof2).payload.jti;
      const jti3 = parseJwt(proof3).payload.jti;

      expect(jti1).not.toBe(jti2);
      expect(jti1).not.toBe(jti3);
      expect(jti2).not.toBe(jti3);
    });
  });

  describe('destroy()', () => {
    it('clears state so subsequent calls throw', async () => {
      await controller.init();
      controller.destroy();

      expect(controller.initialized).toBe(false);
      expect(() => controller.fingerprint).toThrow(DPoPInitError);
      await expect(
        controller.createHttpProof({ method: 'POST', uri: '/api/test' })
      ).rejects.toThrow(DPoPInitError);
      await expect(controller.createRpcProof({ method: 'signalwire.connect' })).rejects.toThrow(
        DPoPInitError
      );
    });

    it('allows re-initialization after destroy', async () => {
      const firstFingerprint = await controller.init();
      controller.destroy();

      const secondFingerprint = await controller.init();

      expect(controller.initialized).toBe(true);
      expect(typeof secondFingerprint).toBe('string');
      expect(secondFingerprint.length).toBeGreaterThan(0);
      // A new key pair should produce a different fingerprint
      expect(secondFingerprint).not.toBe(firstFingerprint);
    });
  });
});
