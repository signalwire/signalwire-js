import { vi } from 'vitest';
import { filterVertoParams } from './VertoMessages';
import { VertoInvite, VertoBye, VertoAnswer } from './VertoMessages';

vi.mock('uuid', () => {
  return {
    v4: vi.fn(() => 'mocked-uuid')
  };
});

describe('filterVertoParams', () => {
  it('should return params unchanged when dialogParams is absent', () => {
    const params = { someKey: 'someValue', other: 42 };
    const result = filterVertoParams(params);

    expect(result).toStrictEqual(params);
  });

  it('should strip remoteSdp, localStream, and remoteStream from dialogParams', () => {
    const params = {
      dialogParams: {
        remoteSdp: 'sdp-data',
        localStream: { fake: 'stream' },
        remoteStream: { fake: 'stream' },
        callerName: 'Alice'
      }
    };

    const result = filterVertoParams(params);

    expect(result.dialogParams).not.toHaveProperty('remoteSdp');
    expect(result.dialogParams).not.toHaveProperty('localStream');
    expect(result.dialogParams).not.toHaveProperty('remoteStream');
  });

  it('should remap SDK field names to verto field names', () => {
    const params = {
      dialogParams: {
        id: 'call-123',
        destinationNumber: '+15551234567',
        callerName: 'Alice',
        callerNumber: '1001',
        remoteCallerName: 'Bob',
        remoteCallerNumber: '1002',
        fromCallAddressId: 'addr-456'
      }
    };

    const result = filterVertoParams(params);
    const dp = result.dialogParams as Record<string, unknown>;

    expect(dp).toStrictEqual({
      callID: 'call-123',
      destination_number: '+15551234567',
      caller_id_name: 'Alice',
      caller_id_number: '1001',
      remote_caller_id_name: 'Bob',
      remote_caller_id_number: '1002',
      from_fabric_address_id: 'addr-456'
    });
  });

  it('should pass through unmapped fields unchanged', () => {
    const params = {
      dialogParams: {
        customField: 'custom-value',
        anotherField: 123
      }
    };

    const result = filterVertoParams(params);
    const dp = result.dialogParams as Record<string, unknown>;

    expect(dp).toStrictEqual({
      customField: 'custom-value',
      anotherField: 123
    });
  });

  it('should not mutate the original params object', () => {
    const originalDialogParams = {
      id: 'call-123',
      callerName: 'Alice',
      remoteSdp: 'sdp-data',
      localStream: { fake: 'stream' }
    };
    const params = {
      dialogParams: originalDialogParams,
      topLevel: 'value'
    };

    const paramsCopy = JSON.parse(JSON.stringify(params));

    filterVertoParams(params);

    expect(params).toStrictEqual(paramsCopy);
  });
});

describe('Verto message builders apply filterVertoParams', () => {
  it('should remap and filter dialogParams in VertoInvite', () => {
    const message = VertoInvite({
      dialogParams: {
        id: 'call-1',
        callerName: 'Alice',
        remoteSdp: 'should-be-stripped'
      }
    });

    expect(message.method).toBe('verto.invite');
    const dp = message.params.dialogParams as Record<string, unknown>;
    expect(dp).toStrictEqual({
      callID: 'call-1',
      caller_id_name: 'Alice'
    });
  });

  it('should remap and filter dialogParams in VertoBye', () => {
    const message = VertoBye({
      dialogParams: {
        id: 'call-2',
        localStream: { fake: 'stream' }
      }
    });

    expect(message.method).toBe('verto.bye');
    const dp = message.params.dialogParams as Record<string, unknown>;
    expect(dp).toStrictEqual({
      callID: 'call-2'
    });
  });

  it('should remap and filter dialogParams in VertoAnswer', () => {
    const message = VertoAnswer({
      dialogParams: {
        callerNumber: '1001',
        remoteStream: { fake: 'stream' }
      }
    });

    expect(message.method).toBe('verto.answer');
    const dp = message.params.dialogParams as Record<string, unknown>;
    expect(dp).toStrictEqual({
      caller_id_number: '1001'
    });
  });
});
