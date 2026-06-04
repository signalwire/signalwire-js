import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveInviteNodeId } from './VertoManager';
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
