import { describe, it, expect } from 'vitest';

import {
  UnexpectedError,
  UnimplementedError,
  NotConnectedError,
  InvalidCredentialsError,
  WebSocketConnectionError,
  TransportConnectionError,
  WebSocketTimeoutError,
  RequestTimeoutError,
  RequestError,
  InvalidListenerError,
  RPCTimeoutError,
  AuthStateHandlerError,
  InvalidStateTransitionError,
  InvalidOptionError,
  StorageNotAvailableError,
  SerializationError,
  DeserializationError,
  StorageWriteError,
  StorageReadError,
  InvalidStorageValueError,
  DependencyError,
  DeviceNotFoundError,
  CallCreateError,
  JSONRPCError,
  InvalidParams,
  ConversationError,
  VertoInviteHandlerError,
  HttpRequestError,
  ValidationError,
  VertoPongError,
  MessageParseError,
  CollectionFetchError,
  MediaTrackError,
  DPoPInitError,
  DeviceTokenError,
  TokenRefreshError
} from './errors';

describe('Error cause chaining', () => {
  const originalError = new Error('original failure');

  describe('errors accepting ErrorOptions', () => {
    it('UnexpectedError propagates cause', () => {
      const error = new UnexpectedError('someMethod', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('UnexpectedError');
      expect(error.message).toContain('someMethod');
    });

    it('UnimplementedError propagates cause', () => {
      const error = new UnimplementedError('custom reason', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('UnimplementedError');
    });

    it('NotConnectedError propagates cause', () => {
      const error = new NotConnectedError('custom reason', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('NotConnectedError');
    });

    it('InvalidCredentialsError propagates cause', () => {
      const error = new InvalidCredentialsError('bad creds', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidCredentialsError');
    });

    it('WebSocketConnectionError propagates cause', () => {
      const error = new WebSocketConnectionError('connection failed', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('WebSocketConnectionError');
    });

    it('TransportConnectionError propagates cause', () => {
      const error = new TransportConnectionError('transport failed', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('TransportConnectionError');
    });

    it('WebSocketTimeoutError propagates cause', () => {
      const error = new WebSocketTimeoutError('timed out', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('WebSocketTimeoutError');
    });

    it('RequestTimeoutError propagates cause', () => {
      const error = new RequestTimeoutError('request timed out', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('RequestTimeoutError');
    });

    it('RequestError propagates cause', () => {
      const error = new RequestError('request failed', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('RequestError');
    });

    it('InvalidListenerError propagates cause', () => {
      const error = new InvalidListenerError({ cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidListenerError');
    });

    it('RPCTimeoutError propagates cause', () => {
      const error = new RPCTimeoutError('req-123', 5000, { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('RPCTimeoutError');
      expect(error.message).toContain('req-123');
      expect(error.message).toContain('5000');
    });

    it('InvalidStateTransitionError propagates cause', () => {
      const error = new InvalidStateTransitionError('idle', 'active', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidStateTransitionError');
    });

    it('InvalidOptionError propagates cause', () => {
      const error = new InvalidOptionError('bad', ['good', 'better'], { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidOptionError');
    });

    it('StorageNotAvailableError propagates cause', () => {
      const error = new StorageNotAvailableError('sessionStorage', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('StorageNotAvailableError');
    });

    it('InvalidStorageValueError propagates cause', () => {
      const error = new InvalidStorageValueError('key', 'function', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidStorageValueError');
    });

    it('DependencyError propagates cause', () => {
      const error = new DependencyError('WebSocket', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('DependencyError');
    });

    it('DeviceNotFoundError propagates cause', () => {
      const error = new DeviceNotFoundError('camera not found', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('DeviceNotFoundError');
    });

    it('JSONRPCError propagates cause', () => {
      const error = new JSONRPCError(-32600, 'invalid request', undefined, {
        cause: originalError
      });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('JSONRPCError');
    });

    it('InvalidParams propagates cause', () => {
      const error = new InvalidParams('bad params', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('InvalidParams');
    });

    it('ConversationError propagates cause', () => {
      const error = new ConversationError('conversation failed', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('ConversationError');
    });

    it('HttpRequestError propagates cause', () => {
      const error = new HttpRequestError('http failed', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('HttpRequestError');
    });

    it('ValidationError propagates cause', () => {
      const error = new ValidationError('invalid input', { cause: originalError });
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('errors with originalError parameter', () => {
    it('SerializationError sets cause from originalError', () => {
      const error = new SerializationError('myKey', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('SerializationError');
    });

    it('DeserializationError sets cause from originalError', () => {
      const error = new DeserializationError('myKey', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('DeserializationError');
    });

    it('StorageWriteError sets cause from originalError', () => {
      const error = new StorageWriteError('myKey', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('StorageWriteError');
    });

    it('StorageReadError sets cause from originalError', () => {
      const error = new StorageReadError('myKey', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('StorageReadError');
    });

    it('VertoPongError sets cause from Error originalError', () => {
      const error = new VertoPongError(originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('VertoPongError');
    });

    it('VertoPongError sets cause to undefined for non-Error', () => {
      const error = new VertoPongError('string error');
      expect(error.cause).toBeUndefined();
    });

    it('MessageParseError sets cause from Error originalError', () => {
      const error = new MessageParseError(originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('MessageParseError');
    });

    it('MessageParseError sets cause to undefined for non-Error', () => {
      const error = new MessageParseError({ bad: 'object' });
      expect(error.cause).toBeUndefined();
    });

    it('CollectionFetchError sets cause from Error originalError', () => {
      const error = new CollectionFetchError('fetchMore', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('CollectionFetchError');
    });

    it('MediaTrackError sets cause from Error originalError', () => {
      const error = new MediaTrackError('replace', 'video', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('MediaTrackError');
    });
  });

  describe('errors with legacy error parameter that auto-derive cause', () => {
    it('AuthStateHandlerError derives cause from error parameter', () => {
      const error = new AuthStateHandlerError(originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('AuthStateHandlerError');
    });

    it('AuthStateHandlerError sets cause to undefined for non-Error', () => {
      const error = new AuthStateHandlerError('string error');
      expect(error.cause).toBeUndefined();
    });

    it('VertoInviteHandlerError derives cause from error parameter', () => {
      const error = new VertoInviteHandlerError(originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('VertoInviteHandlerError');
    });

    it('VertoInviteHandlerError sets cause to undefined for non-Error', () => {
      const error = new VertoInviteHandlerError(42);
      expect(error.cause).toBeUndefined();
    });

    it('CallCreateError derives cause from error parameter', () => {
      const error = new CallCreateError('call failed', originalError);
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('CallCreateError');
    });

    it('CallCreateError sets cause to undefined for non-Error', () => {
      const error = new CallCreateError('call failed', 'not an error');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('backward compatibility', () => {
    it('errors work without cause parameter', () => {
      expect(new UnexpectedError().message).toContain('Unexpected Error');
      expect(new UnimplementedError().message).toBe('Not Implemented');
      expect(new NotConnectedError().message).toBe('Not Connected');
      expect(new InvalidCredentialsError().message).toBe('Invalid Credentials');
      expect(new WebSocketConnectionError('msg').message).toBe('msg');
      expect(new RequestTimeoutError('timeout').message).toBe('timeout');
      expect(new InvalidListenerError().message).toBe('listener is not a function');
      expect(new RPCTimeoutError('r1', 1000).message).toContain('r1');
      expect(new AuthStateHandlerError().cause).toBeUndefined();
      expect(new VertoInviteHandlerError().cause).toBeUndefined();
      expect(new CallCreateError('fail').cause).toBeUndefined();
    });

    it('cause is undefined when no options provided', () => {
      const error = new RequestError('some error');
      expect(error.cause).toBeUndefined();
    });
  });
});

describe('CallCreateError - direction field', () => {
  it('defaults direction to outbound', () => {
    const error = new CallCreateError('timeout');
    expect(error.direction).toBe('outbound');
  });

  it('accepts inbound direction', () => {
    const error = new CallCreateError('invite error', null, 'inbound');
    expect(error.direction).toBe('inbound');
  });

  it('accepts outbound direction explicitly', () => {
    const error = new CallCreateError('dial error', null, 'outbound');
    expect(error.direction).toBe('outbound');
  });

  it('still derives cause from error parameter when direction is provided', () => {
    const cause = new Error('underlying');
    const error = new CallCreateError('fail', cause, 'inbound');
    expect(error.cause).toBe(cause);
    expect(error.direction).toBe('inbound');
  });
});

describe('CallError interface and CallErrorKind', () => {
  it('CallError object can be constructed with all fields', () => {
    const raw = new Error('rpc');
    const callError: import('./errors').CallError = {
      kind: 'signaling',
      fatal: true,
      error: raw,
      callId: 'call-123'
    };
    expect(callError.kind).toBe('signaling');
    expect(callError.fatal).toBe(true);
    expect(callError.error).toBe(raw);
    expect(callError.callId).toBe('call-123');
  });

  it('all CallErrorKind values are valid string literals', () => {
    const kinds: import('./errors').CallErrorKind[] = [
      'media',
      'signaling',
      'timeout',
      'rejected',
      'network',
      'internal'
    ];
    expect(kinds).toHaveLength(6);
    kinds.forEach((k) => expect(typeof k).toBe('string'));
  });
});

describe('DPoP / Client Bound SAT error types', () => {
  const originalError = new Error('crypto failed');

  describe('DPoPInitError', () => {
    it('sets name and message', () => {
      const error = new DPoPInitError(originalError);
      expect(error.name).toBe('DPoPInitError');
      expect(error.message).toBe('Failed to initialize DPoP key pair');
    });

    it('chains cause from Error original', () => {
      const error = new DPoPInitError(originalError);
      expect(error.cause).toBe(originalError);
      expect(error.originalError).toBe(originalError);
    });

    it('handles non-Error original gracefully', () => {
      const error = new DPoPInitError('string error');
      expect(error.cause).toBeUndefined();
      expect(error.originalError).toBe('string error');
    });
  });

  describe('DeviceTokenError', () => {
    it('sets name and message', () => {
      const error = new DeviceTokenError('token request failed');
      expect(error.name).toBe('DeviceTokenError');
      expect(error.message).toBe('token request failed');
    });

    it('chains cause from Error original', () => {
      const error = new DeviceTokenError('failed', originalError);
      expect(error.cause).toBe(originalError);
    });

    it('works without originalError', () => {
      const error = new DeviceTokenError('no cause');
      expect(error.cause).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('TokenRefreshError', () => {
    it('sets name and message', () => {
      const error = new TokenRefreshError('refresh failed');
      expect(error.name).toBe('TokenRefreshError');
      expect(error.message).toBe('refresh failed');
    });

    it('chains cause from Error original', () => {
      const error = new TokenRefreshError('failed', originalError);
      expect(error.cause).toBe(originalError);
    });

    it('works without originalError', () => {
      const error = new TokenRefreshError('no cause');
      expect(error.cause).toBeUndefined();
    });
  });
});
