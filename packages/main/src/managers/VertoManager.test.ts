import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveInviteNodeId, findNestedVertoFailure } from './VertoManager';
import { VertoInfo, WebrtcVerto } from '../core/RPCMessages';

describe('VertoManager - sendDigits', () => {
  const mockCallId = 'test-call-id-123';
  const mockNodeId = 'test-node-id-456';
  const mockMemberId = 'test-member-id-789';

  const mockDialogParams = {
    id: mockCallId,
    destinationNumber: '/public/test-room',
    attach: false,
    reattaching: false,
    callerName: 'Test Caller',
    callerNumber: 'test-caller',
    remoteCallerName: 'Test Room',
    remoteCallerNumber: '/public/test-room',
    userVariables: {
      memberCallId: mockCallId,
      memberId: mockMemberId
    },
    screenShare: false,
    additionalDevice: false,
    pingSupported: true,
    version: '2'
  };

  describe('VertoInfo message creation', () => {
    it('should create a valid verto.info message with dtmf', () => {
      const dtmf = '123#';
      const message = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      expect(message).toBeDefined();
      expect(message.method).toBe('verto.info');
      expect(message.params).toBeDefined();
      expect(message.params.dtmf).toBe(dtmf);
      expect(message.params.dialogParams).toBeDefined();
    });

    it('should handle single digit DTMF', () => {
      const dtmf = '5';
      const message = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      expect(message.params.dtmf).toBe('5');
    });

    it('should handle DTMF with special characters', () => {
      const dtmf = '*123#';
      const message = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      expect(message.params.dtmf).toBe('*123#');
    });

    it('should handle DTMF with wait characters', () => {
      const dtmf = '1w2w3w#';
      const message = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      expect(message.params.dtmf).toBe('1w2w3w#');
    });

    it('should handle empty dtmf string', () => {
      const dtmf = '';
      const message = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      expect(message.params.dtmf).toBe('');
    });
  });

  describe('WebrtcVerto wrapper', () => {
    it('should wrap VertoInfo message in webrtc.verto request', () => {
      const dtmf = '123';
      const vertoInfoMessage = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      const webrtcVertoMessage = WebrtcVerto({
        callID: mockCallId,
        node_id: mockNodeId,
        message: vertoInfoMessage
      });

      expect(webrtcVertoMessage).toBeDefined();
      expect(webrtcVertoMessage.method).toBe('webrtc.verto');
      expect(webrtcVertoMessage.params).toBeDefined();
      expect(webrtcVertoMessage.params.callID).toBe(mockCallId);
      expect(webrtcVertoMessage.params.node_id).toBe(mockNodeId);
      expect(webrtcVertoMessage.params.message).toBe(vertoInfoMessage);
    });

    it('should include the complete verto.info message structure', () => {
      const dtmf = '456*';
      const vertoInfoMessage = VertoInfo({
        dialogParams: mockDialogParams,
        dtmf
      });

      const webrtcVertoMessage = WebrtcVerto({
        callID: mockCallId,
        node_id: mockNodeId,
        message: vertoInfoMessage
      });

      const innerMessage = webrtcVertoMessage.params.message;
      expect(innerMessage.method).toBe('verto.info');
      expect(innerMessage.params.dtmf).toBe('456*');
    });
  });

  describe('dialogParams transformation', () => {
    it('should transform id to callID in dialogParams', () => {
      const message = VertoInfo({
        dialogParams: { id: 'test-id' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.callID).toBe('test-id');
      expect(message.params.dialogParams.id).toBeUndefined();
    });

    it('should transform callerName to caller_id_name', () => {
      const message = VertoInfo({
        dialogParams: { callerName: 'Test Caller' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.caller_id_name).toBe('Test Caller');
      expect(message.params.dialogParams.callerName).toBeUndefined();
    });

    it('should transform callerNumber to caller_id_number', () => {
      const message = VertoInfo({
        dialogParams: { callerNumber: '1234567890' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.caller_id_number).toBe('1234567890');
      expect(message.params.dialogParams.callerNumber).toBeUndefined();
    });

    it('should transform remoteCallerName to remote_caller_id_name', () => {
      const message = VertoInfo({
        dialogParams: { remoteCallerName: 'Remote Caller' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.remote_caller_id_name).toBe('Remote Caller');
      expect(message.params.dialogParams.remoteCallerName).toBeUndefined();
    });

    it('should transform remoteCallerNumber to remote_caller_id_number', () => {
      const message = VertoInfo({
        dialogParams: { remoteCallerNumber: '0987654321' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.remote_caller_id_number).toBe('0987654321');
      expect(message.params.dialogParams.remoteCallerNumber).toBeUndefined();
    });

    it('should transform destinationNumber to destination_number', () => {
      const message = VertoInfo({
        dialogParams: { destinationNumber: '/public/test-room' },
        dtmf: '1'
      });

      expect(message.params.dialogParams.destination_number).toBe('/public/test-room');
      expect(message.params.dialogParams.destinationNumber).toBeUndefined();
    });
  });
});

describe('resolveInviteNodeId', () => {
  it('strips node_id on a fresh invite when caller did not supply nodeId', () => {
    expect(
      resolveInviteNodeId({
        isInvite: true,
        reattach: false,
        explicitNodeId: undefined,
        currentNodeId: null
      })
    ).toBe('');
  });

  it('carries explicit nodeId on a fresh invite (steering hint)', () => {
    expect(
      resolveInviteNodeId({
        isInvite: true,
        reattach: false,
        explicitNodeId: 'fs-staging-7',
        currentNodeId: 'fs-staging-7'
      })
    ).toBe('fs-staging-7');
  });

  it('treats empty explicitNodeId as "no preference" and strips', () => {
    expect(
      resolveInviteNodeId({
        isInvite: true,
        reattach: false,
        explicitNodeId: '',
        currentNodeId: null
      })
    ).toBe('');
  });

  it('carries persisted nodeId on a reattach invite', () => {
    expect(
      resolveInviteNodeId({
        isInvite: true,
        reattach: true,
        explicitNodeId: 'fs-original-3',
        currentNodeId: 'fs-original-3'
      })
    ).toBe('fs-original-3');
  });

  it('carries currentNodeId on non-invite frames (verto.modify, verto.bye)', () => {
    expect(
      resolveInviteNodeId({
        isInvite: false,
        reattach: false,
        explicitNodeId: undefined,
        currentNodeId: 'fs-active-2'
      })
    ).toBe('fs-active-2');
  });

  it('falls back to empty string when currentNodeId is null on non-invite frames', () => {
    expect(
      resolveInviteNodeId({
        isInvite: false,
        reattach: false,
        explicitNodeId: undefined,
        currentNodeId: null
      })
    ).toBe('');
  });

  it('uses currentNodeId on fresh invite with explicit nodeId — server-updated value flows', () => {
    // Caller asked for A, server placed call on B and updated _nodeId$ to B.
    // Subsequent frames should use B (currentNodeId), not A (explicitNodeId).
    // resolveInviteNodeId returns currentNodeId in this case because stripForFresh is false.
    expect(
      resolveInviteNodeId({
        isInvite: true,
        reattach: false,
        explicitNodeId: 'fs-A',
        currentNodeId: 'fs-B'
      })
    ).toBe('fs-B');
  });
});

describe('findNestedVertoFailure', () => {
  it('surfaces the innermost verto code even when the outer delivery code is 200', () => {
    // Real frame observed on staging: delivered (outer 200), but the verto.info op
    // itself was rejected (innermost 400).
    const response = {
      jsonrpc: '2.0',
      id: '2eedd0ed-c158-467c-b4ba-3ce8d93f5ad4',
      result: {
        node_id: '7df08b07-bbcb-4e32-93bc-2c852a62dd39@',
        result: {
          jsonrpc: '2.0',
          id: 'adf9052e-4abe-4528-863b-89ba1d58f4bd',
          result: {
            code: '400',
            message: 'Bad request'
          }
        },
        code: '200'
      }
    };

    expect(findNestedVertoFailure(response)).toEqual({ code: '400', message: 'Bad request' });
  });

  it('returns null when every nested code is 2xx (success)', () => {
    const response = {
      jsonrpc: '2.0',
      id: '1',
      result: {
        node_id: 'node@',
        code: '200',
        result: {
          jsonrpc: '2.0',
          id: '2',
          result: { code: '200', message: 'OK' }
        }
      }
    };

    expect(findNestedVertoFailure(response)).toBeNull();
  });

  it('surfaces a delivery-layer failure (outer non-2xx, no deeper result)', () => {
    const response = {
      jsonrpc: '2.0',
      id: '1',
      result: { node_id: 'node@', code: '403', message: 'Not allowed' }
    };

    expect(findNestedVertoFailure(response)).toEqual({ code: '403', message: 'Not allowed' });
  });

  it('fails fast on the first non-2xx code encountered while descending', () => {
    // Defensive: a delivery refusal should win even if a stale 200 sits deeper.
    const response = {
      result: {
        code: '500',
        result: { result: { code: '200' } }
      }
    };

    expect(findNestedVertoFailure(response)).toEqual({ code: '500', message: undefined });
  });

  it('omits message when the failing layer has none', () => {
    const response = { result: { result: { code: '404' } } };

    expect(findNestedVertoFailure(response)).toEqual({ code: '404', message: undefined });
  });

  it('coerces numeric codes to strings before matching', () => {
    expect(findNestedVertoFailure({ result: { code: 400 } })).toEqual({
      code: '400',
      message: undefined
    });
    expect(findNestedVertoFailure({ result: { code: 200 } })).toBeNull();
  });

  it('returns null when no code appears anywhere', () => {
    const response = {
      jsonrpc: '2.0',
      id: '1',
      result: { node_id: 'node@', result: { jsonrpc: '2.0', id: '2', result: {} } }
    };

    expect(findNestedVertoFailure(response)).toBeNull();
  });

  it('returns null for non-object / nullish inputs', () => {
    expect(findNestedVertoFailure(null)).toBeNull();
    expect(findNestedVertoFailure(undefined)).toBeNull();
    expect(findNestedVertoFailure('nope')).toBeNull();
  });
});

describe('VertoManager - sendCallControl wire shape', () => {
  const callID = 'call-id-abc';

  // The server reads the control payload at the PARAMS level (a sibling of
  // dialogParams, same level as `dtmf`) — NOT inside dialogParams. It previously
  // accepted dialogParams.command, so this locks the current contract: nothing else
  // asserts the wire shape, which is how a server-side move slipped through silently.
  it('puts command at the params level, as a sibling of dialogParams', () => {
    const message = VertoInfo({
      dialogParams: { callID },
      command: { method: 'call.mute', params: { channels: ['audio'] } }
    });

    expect(message.method).toBe('verto.info');
    expect(message.params.command).toEqual({
      method: 'call.mute',
      params: { channels: ['audio'] }
    });
    // callID still identifies the dialog...
    expect((message.params.dialogParams as Record<string, unknown>).callID).toBe(callID);
    // ...but command must NOT be nested inside dialogParams.
    expect(message.params.dialogParams).not.toHaveProperty('command');
  });

  it('passes command through verbatim (no dialogParams key filtering/renaming)', () => {
    // filterVertoParams rewrites keys inside dialogParams (e.g. id -> callID) and drops
    // EXCLUDED_DIALOG_PARAMS; params-level keys are untouched, so nested control params
    // keep their exact names.
    const command = {
      method: 'call.member.position.set',
      params: { targets: [{ call_id: callID, position: 'reserved-0' }] }
    };
    const message = VertoInfo({ dialogParams: { callID }, command });

    expect(message.params.command).toEqual(command);
  });
});

describe('findNestedVertoFailure - JSONRPC error shape', () => {
  // Verbatim from a CI run: the server refused a self op that carried a target it derives
  // itself. The code sits inside `error`, not as a bare sibling `code`, so a walk that only
  // inspects `code` steps past it and reports success — the caller's promise then resolves
  // and the state observable never changes, which reads as a silent no-op rather than a
  // rejection. Every e2e control test timed out on exactly this.
  it('detects an error nested at result.result.error', () => {
    const response = {
      jsonrpc: '2.0',
      id: 'outer',
      result: {
        node_id: 'node@us-east',
        code: '200', // delivery succeeded — only the inner op was refused
        result: { jsonrpc: '2.0', id: 0, error: { code: -32600, message: 'Invalid Request' } }
      }
    };

    expect(findNestedVertoFailure(response)).toEqual({
      code: '-32600',
      message: 'Invalid Request'
    });
  });

  it('detects a top-level JSONRPC error', () => {
    expect(findNestedVertoFailure({ error: { code: -32001, message: 'no such call' } })).toEqual({
      code: '-32001',
      message: 'no such call'
    });
  });

  it('still returns null for a fully successful envelope', () => {
    const ok = {
      result: { node_id: 'n', code: '200', result: { jsonrpc: '2.0', id: 1, result: { code: '200' } } }
    };

    expect(findNestedVertoFailure(ok)).toBeNull();
  });
});
