/**
 * Pins the fatality model, which had no coverage before cloud-product#20523.
 *
 * `isFatalError` is a default-fatal allowlist: anything unrecognised destroys
 * the call, which is how an auxiliary-leg `OverconstrainedError` killed one.
 * The default is deliberately kept — callers knowing the leg pass an explicit
 * `fatal` — so these tests make any future change to it a conscious one.
 */
import { describe, expect, it } from 'vitest';

import { inferCallErrorKind, isFatalError } from './CallFactory';
import {
  RPC_ERROR_AUTHENTICATION_FAILED,
  RPC_ERROR_INVALID_PARAMS,
  RPC_ERROR_REQUESTER_VALIDATION_FAILED
} from '../core/constants';
import {
  JSONRPCError,
  MediaAccessError,
  MediaTrackError,
  RPCTimeoutError,
  TransportConnectionError,
  VertoPongError,
  WebSocketConnectionError
} from '../core/errors';

describe('isFatalError', () => {
  describe('exemptions — the call survives', () => {
    it('a VertoPongError is not fatal', () => {
      expect(isFatalError(new VertoPongError('pong failed', new Error('boom')))).toBe(false);
    });

    it('a MediaTrackError is not fatal', () => {
      expect(
        isFatalError(new MediaTrackError('updateSendersConstraints', 'audio', new Error('boom')))
      ).toBe(false);
    });

    it('an RPCTimeoutError is not fatal', () => {
      expect(isFatalError(new RPCTimeoutError('req-1', 5000))).toBe(false);
    });

    it.each([
      ['requester validation failed', RPC_ERROR_REQUESTER_VALIDATION_FAILED],
      ['authentication failed', RPC_ERROR_AUTHENTICATION_FAILED],
      ['invalid params', RPC_ERROR_INVALID_PARAMS]
    ])('a JSONRPCError with a recoverable code (%s) is not fatal', (_label, code) => {
      expect(isFatalError(new JSONRPCError(code, 'rpc failed'))).toBe(false);
    });
  });

  describe('MediaAccessError delegates to its own flag', () => {
    it('is not fatal when the wrapping site said so', () => {
      expect(
        isFatalError(new MediaAccessError('addInputDevice', 'audio', new Error('denied'), false))
      ).toBe(false);
    });

    it('is fatal when the wrapping site said the call cannot continue', () => {
      expect(
        isFatalError(new MediaAccessError('acquireLocalMedia', 'audiovideo', new Error('denied'), true))
      ).toBe(true);
    });

    it('defaults to non-fatal when no flag is given', () => {
      expect(isFatalError(new MediaAccessError('startScreenShare', 'screen', new Error('x')))).toBe(
        false
      );
    });
  });

  describe('the default-fatal branch', () => {
    it('a bare DOMException-shaped error is fatal', () => {
      // The cloud-product#20523 payload: matches no exemption above.
      const overconstrained = new Error('Cannot satisfy constraints');
      overconstrained.name = 'OverconstrainedError';
      expect(isFatalError(overconstrained)).toBe(true);
    });

    it('a plain Error is fatal', () => {
      expect(isFatalError(new Error('something unexpected'))).toBe(true);
    });

    it('a JSONRPCError with a non-recoverable code is fatal', () => {
      expect(isFatalError(new JSONRPCError(-32000, 'invite rejected'))).toBe(true);
    });

    it('a transport failure is fatal', () => {
      expect(isFatalError(new WebSocketConnectionError('socket closed'))).toBe(true);
    });
  });
});

describe('inferCallErrorKind', () => {
  it.each([
    ['timeout', new RPCTimeoutError('req-1', 5000), 'timeout'],
    ['signaling', new JSONRPCError(-32000, 'rpc failed'), 'signaling'],
    ['media (track)', new MediaTrackError('op', 'audio', new Error('x')), 'media'],
    ['media (access)', new MediaAccessError('op', 'audio', new Error('x')), 'media'],
    ['network (websocket)', new WebSocketConnectionError('closed'), 'network'],
    ['network (transport)', new TransportConnectionError('lost'), 'network'],
    ['internal', new Error('unknown'), 'internal']
  ])('classifies %s', (_label, error, expected) => {
    expect(inferCallErrorKind(error as Error)).toBe(expected);
  });

  it('classifies an OverconstrainedError as internal, not media', () => {
    // Why the #20523 chain was fatal: a raw constraint failure gets neither the
    // 'media' kind nor the MediaTrackError exemption.
    const overconstrained = new Error('Cannot satisfy constraints');
    overconstrained.name = 'OverconstrainedError';
    expect(inferCallErrorKind(overconstrained)).toBe('internal');
  });
});
