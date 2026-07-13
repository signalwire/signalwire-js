import { describe, it, expect } from 'vitest';
import {
  isVertoAttachMessage,
  isVertoAttachParamsGuard,
  isVertoByeInboundMessage,
  isVertoByeInboundParamsGuard,
  isVertoByeParamsGuard,
  getVertoMethodGuard,
  getVertoParamsGuard,
  VertoMethodTypeMap,
  VertoParamsTypeMap
} from './verto.guards';
import type {
  VertoAttachMessage,
  VertoAttachParams,
  VertoByeInboundMessage,
  VertoByeParams
} from '../types/verto';

describe('Verto Attach Guards', () => {
  // Valid test fixtures
  const validAttachParams: VertoAttachParams = {
    callID: 'test-call-id-123',
    sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n',
    callee_id_number: '+1234567890',
    callee_id_name: 'Test Callee',
    caller_id_number: '+0987654321',
    caller_id_name: 'Test Caller',
    display_direction: 'outbound',
    variables: { some: 'value' }
  };

  const validAttachMessage: VertoAttachMessage = {
    jsonrpc: '2.0',
    id: 'msg-id-456',
    method: 'verto.attach',
    params: validAttachParams
  };

  describe('isVertoAttachMessage', () => {
    it('should return true for a valid verto.attach message', () => {
      expect(isVertoAttachMessage(validAttachMessage)).toBe(true);
    });

    it('should return false for a message with wrong method', () => {
      const wrongMethod = {
        ...validAttachMessage,
        method: 'verto.invite'
      };
      expect(isVertoAttachMessage(wrongMethod)).toBe(false);
    });

    it('should return false for a message with wrong jsonrpc version', () => {
      const wrongVersion = {
        ...validAttachMessage,
        jsonrpc: '1.0'
      };
      expect(isVertoAttachMessage(wrongVersion)).toBe(false);
    });

    it('should return false for a message without id', () => {
      const { id: _, ...noId } = validAttachMessage;
      expect(isVertoAttachMessage(noId)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isVertoAttachMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isVertoAttachMessage(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isVertoAttachMessage('string')).toBe(false);
      expect(isVertoAttachMessage(123)).toBe(false);
      expect(isVertoAttachMessage(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isVertoAttachMessage({})).toBe(false);
    });

    it('should distinguish verto.attach from other verto methods', () => {
      const byeMessage = {
        jsonrpc: '2.0',
        id: 'msg-id',
        method: 'verto.bye',
        params: { callID: 'test' }
      };
      const inviteMessage = {
        jsonrpc: '2.0',
        id: 'msg-id',
        method: 'verto.invite',
        params: { callID: 'test', sdp: 'v=0...' }
      };

      expect(isVertoAttachMessage(byeMessage)).toBe(false);
      expect(isVertoAttachMessage(inviteMessage)).toBe(false);
    });
  });

  describe('isVertoAttachParamsGuard', () => {
    it('should return true for valid attach params', () => {
      expect(isVertoAttachParamsGuard(validAttachParams)).toBe(true);
    });

    it('should return false when callID is missing', () => {
      const { callID: _, ...noCallID } = validAttachParams;
      expect(isVertoAttachParamsGuard(noCallID)).toBe(false);
    });

    it('should return false when sdp is missing', () => {
      const { sdp: _, ...noSdp } = validAttachParams;
      expect(isVertoAttachParamsGuard(noSdp)).toBe(false);
    });

    it('should return false when sdp is not a string', () => {
      const invalidSdp = { ...validAttachParams, sdp: 123 };
      expect(isVertoAttachParamsGuard(invalidSdp)).toBe(false);
    });

    it('should return false when callee_id_number is missing', () => {
      const { callee_id_number: _, ...noCalleeNumber } = validAttachParams;
      expect(isVertoAttachParamsGuard(noCalleeNumber)).toBe(false);
    });

    it('should return false when callee_id_name is missing', () => {
      const { callee_id_name: _, ...noCalleeName } = validAttachParams;
      expect(isVertoAttachParamsGuard(noCalleeName)).toBe(false);
    });

    it('should return false when caller_id_number is missing', () => {
      const { caller_id_number: _, ...noCallerNumber } = validAttachParams;
      expect(isVertoAttachParamsGuard(noCallerNumber)).toBe(false);
    });

    it('should return false when caller_id_name is missing', () => {
      const { caller_id_name: _, ...noCallerName } = validAttachParams;
      expect(isVertoAttachParamsGuard(noCallerName)).toBe(false);
    });

    it('should return false when callID is not a string', () => {
      const invalidCallID = { ...validAttachParams, callID: 123 };
      expect(isVertoAttachParamsGuard(invalidCallID)).toBe(false);
    });

    it('should return false when callee_id_number is not a string', () => {
      const invalidCalleeNumber = { ...validAttachParams, callee_id_number: 123 };
      expect(isVertoAttachParamsGuard(invalidCalleeNumber)).toBe(false);
    });

    it('should return false when callee_id_name is not a string', () => {
      const invalidCalleeName = { ...validAttachParams, callee_id_name: null };
      expect(isVertoAttachParamsGuard(invalidCalleeName)).toBe(false);
    });

    it('should return false when caller_id_number is not a string', () => {
      const invalidCallerNumber = { ...validAttachParams, caller_id_number: {} };
      expect(isVertoAttachParamsGuard(invalidCallerNumber)).toBe(false);
    });

    it('should return false when caller_id_name is not a string', () => {
      const invalidCallerName = { ...validAttachParams, caller_id_name: [] };
      expect(isVertoAttachParamsGuard(invalidCallerName)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isVertoAttachParamsGuard(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isVertoAttachParamsGuard(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isVertoAttachParamsGuard('string')).toBe(false);
      expect(isVertoAttachParamsGuard(123)).toBe(false);
      expect(isVertoAttachParamsGuard(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isVertoAttachParamsGuard({})).toBe(false);
    });

    it('should accept params with additional properties', () => {
      const withExtra = {
        ...validAttachParams,
        extra_field: 'some value',
        another_field: 123
      };
      expect(isVertoAttachParamsGuard(withExtra)).toBe(true);
    });
  });

  describe('VertoParamsTypeMap', () => {
    it('should include verto.attach mapping', () => {
      expect(VertoParamsTypeMap['verto.attach']).toBeDefined();
      expect(VertoParamsTypeMap['verto.attach']).toBe(isVertoAttachParamsGuard);
    });
  });

  describe('getVertoParamsGuard', () => {
    it('should return the correct guard for verto.attach', () => {
      const guard = getVertoParamsGuard('verto.attach');
      expect(guard).toBeDefined();
      expect(guard).toBe(isVertoAttachParamsGuard);
    });

    it('should return undefined for unknown methods', () => {
      const guard = getVertoParamsGuard('verto.unknown');
      expect(guard).toBeUndefined();
    });

    it('returned guard should validate attach params correctly', () => {
      const guard = getVertoParamsGuard('verto.attach');
      expect(guard?.(validAttachParams)).toBe(true);
      expect(guard?.({})).toBe(false);
    });
  });

  describe('Type narrowing', () => {
    it('should provide correct type narrowing for attach message', () => {
      const unknownMessage: unknown = validAttachMessage;

      if (isVertoAttachMessage(unknownMessage)) {
        // TypeScript should know this is VertoAttachMessage
        expect(unknownMessage.method).toBe('verto.attach');
        expect(unknownMessage.params.callID).toBe('test-call-id-123');
      }
    });

    it('should provide correct type narrowing for attach params', () => {
      const unknownParams: unknown = validAttachParams;

      if (isVertoAttachParamsGuard(unknownParams)) {
        // TypeScript should know this is VertoAttachParams
        expect(unknownParams.callID).toBe('test-call-id-123');
        expect(unknownParams.callee_id_number).toBe('+1234567890');
        expect(unknownParams.callee_id_name).toBe('Test Callee');
        expect(unknownParams.caller_id_number).toBe('+0987654321');
        expect(unknownParams.caller_id_name).toBe('Test Caller');
      }
    });
  });
});

describe('isVertoByeParamsGuard', () => {
  const validByeParams: VertoByeParams = {
    dialogParams: { callID: 'test-call-id-123' },
    cause: 'NORMAL_CLEARING',
    causeCode: '16'
  };

  it('should return true for params carrying dialogParams.callID', () => {
    expect(isVertoByeParamsGuard(validByeParams)).toBe(true);
  });

  it('should return true without cause/causeCode (both optional)', () => {
    expect(isVertoByeParamsGuard({ dialogParams: { callID: 'abc' } })).toBe(true);
  });

  it('should return false when dialogParams is missing', () => {
    expect(isVertoByeParamsGuard({ cause: 'USER_BUSY', causeCode: '17' })).toBe(false);
  });

  it('should return false when dialogParams.callID is missing', () => {
    expect(isVertoByeParamsGuard({ dialogParams: {} })).toBe(false);
  });

  it('should return false when dialogParams.callID is not a string', () => {
    expect(isVertoByeParamsGuard({ dialogParams: { callID: 123 } })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isVertoByeParamsGuard(null)).toBe(false);
    expect(isVertoByeParamsGuard(undefined)).toBe(false);
    expect(isVertoByeParamsGuard('string')).toBe(false);
    expect(isVertoByeParamsGuard({})).toBe(false);
  });

  it('should be wired into VertoParamsTypeMap', () => {
    expect(VertoParamsTypeMap['verto.bye']).toBe(isVertoByeParamsGuard);
    expect(getVertoParamsGuard('verto.bye')).toBe(isVertoByeParamsGuard);
  });
});

describe('isVertoByeInboundMessage', () => {
  const validInboundBye: VertoByeInboundMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'verto.bye',
    params: { callID: 'test-call-id-123', cause: 'NORMAL_CLEARING', causeCode: '16' }
  };

  it('should return true for an inbound verto.bye frame', () => {
    expect(isVertoByeInboundMessage(validInboundBye)).toBe(true);
  });

  it('should return true without params (server may omit them)', () => {
    expect(isVertoByeInboundMessage({ jsonrpc: '2.0', id: 1, method: 'verto.bye' })).toBe(true);
  });

  it('should return false for a different verto method', () => {
    expect(isVertoByeInboundMessage({ ...validInboundBye, method: 'verto.media' })).toBe(false);
  });

  it('should return false when the JSON-RPC envelope is malformed', () => {
    expect(isVertoByeInboundMessage({ method: 'verto.bye', params: { callID: 'abc' } })).toBe(
      false
    );
    expect(isVertoByeInboundMessage({ jsonrpc: '1.0', id: 1, method: 'verto.bye' })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isVertoByeInboundMessage(null)).toBe(false);
    expect(isVertoByeInboundMessage(undefined)).toBe(false);
    expect(isVertoByeInboundMessage('verto.bye')).toBe(false);
    expect(isVertoByeInboundMessage({})).toBe(false);
  });

  it('should be wired into VertoMethodTypeMap', () => {
    expect(VertoMethodTypeMap['verto.bye']).toBe(isVertoByeInboundMessage);
    expect(getVertoMethodGuard('verto.bye')).toBe(isVertoByeInboundMessage);
  });
});

describe('isVertoByeInboundParamsGuard', () => {
  it('should return true for inbound bye params carrying a top-level callID', () => {
    expect(isVertoByeInboundParamsGuard({ callID: 'test-call-id-123' })).toBe(true);
    expect(
      isVertoByeInboundParamsGuard({ callID: 'abc', cause: 'NORMAL_CLEARING', causeCode: '16' })
    ).toBe(true);
  });

  // Crux: vertoBye$ emits this params object while answered$ emits a boolean.
  // The guard must distinguish the bye object from the accept/reject signals.
  it('should return false for boolean answer/reject signals', () => {
    expect(isVertoByeInboundParamsGuard(true)).toBe(false);
    expect(isVertoByeInboundParamsGuard(false)).toBe(false);
  });

  it('should return false when callID is missing or not a string', () => {
    expect(isVertoByeInboundParamsGuard({ cause: 'USER_BUSY' })).toBe(false);
    expect(isVertoByeInboundParamsGuard({ callID: 123 })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isVertoByeInboundParamsGuard(null)).toBe(false);
    expect(isVertoByeInboundParamsGuard(undefined)).toBe(false);
    expect(isVertoByeInboundParamsGuard('verto.bye')).toBe(false);
    expect(isVertoByeInboundParamsGuard({})).toBe(false);
  });
});
