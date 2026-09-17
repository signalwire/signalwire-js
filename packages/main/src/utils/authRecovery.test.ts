import { describe, it, expect } from 'vitest';

import { CallCreateError, JSONRPCError } from '../core/errors';

import { findJSONRPCError, isRecoverableAuthError } from './authRecovery';

describe('findJSONRPCError', () => {
  it('returns the error itself when it is a JSONRPCError', () => {
    const err = new JSONRPCError(-32003, 'Requester validation failed');
    expect(findJSONRPCError(err)).toBe(err);
  });

  it('unwraps a JSONRPCError nested via the `error` property (CallCreateError)', () => {
    const inner = new JSONRPCError(-32003, 'Requester validation failed');
    const wrapped = new CallCreateError('Call creation failed', inner, 'outbound');
    expect(findJSONRPCError(wrapped)).toBe(inner);
  });

  it('unwraps a JSONRPCError nested via the `cause` chain', () => {
    const inner = new JSONRPCError(-32002, 'auth failed');
    const outer = new Error('wrapper', { cause: inner });
    expect(findJSONRPCError(outer)).toBe(inner);
  });

  it('returns undefined when no JSONRPCError is present', () => {
    expect(findJSONRPCError(new Error('boom'))).toBeUndefined();
    expect(findJSONRPCError('not an error')).toBeUndefined();
    expect(findJSONRPCError(undefined)).toBeUndefined();
  });

  it('terminates on a cyclic cause chain', () => {
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    (a as { cause?: unknown }).cause = b; // cycle
    expect(findJSONRPCError(a)).toBeUndefined();
  });
});

describe('isRecoverableAuthError', () => {
  it('is true for -32003 (requester validation failed)', () => {
    expect(isRecoverableAuthError(new JSONRPCError(-32003, 'x'))).toBe(true);
  });

  it('is true for -32002 (authentication failed)', () => {
    expect(isRecoverableAuthError(new JSONRPCError(-32002, 'x'))).toBe(true);
  });

  it('is true for a -32003 wrapped in a CallCreateError (the dial() shape)', () => {
    const wrapped = new CallCreateError(
      'Call creation failed',
      new JSONRPCError(-32003, 'x'),
      'outbound'
    );
    expect(isRecoverableAuthError(wrapped)).toBe(true);
  });

  it('is false for other JSON-RPC codes', () => {
    expect(isRecoverableAuthError(new JSONRPCError(-32602, 'invalid params'))).toBe(false);
  });

  it('is false for non-JSONRPC errors', () => {
    expect(isRecoverableAuthError(new Error('network timeout'))).toBe(false);
  });
});
