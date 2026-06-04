import { describe, it, expect } from 'vitest';
import { CallJoinedRequest, CallLeftRequest, MemberUpdatedRequest } from './types/events';
import {
  createEventMetadataGuard,
  createEventRequestGuard,
  isCallJoinedMetadata,
  isCallJoinedRequest,
  isCallLeftMetadata,
  isCallLeftRequest,
  isMemberUpdatedRequest
} from './guards/events.guards';
import { ExtractParams } from './types/base';

describe('Type Guard Factory System', () => {
  describe('createEventRequestGuard', () => {
    it('should create a guard that validates SignalWire event requests', () => {
      const mockCallJoinedRequest: CallJoinedRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'signalwire.event',
        params: {
          event_type: 'call.joined',
          event_channel: 'room.xyz',
          timestamp: 1234567890,
          params: {
            room_session: {} as any,
            room_id: 'room_123',
            room_session_id: 'session_456',
            call_id: 'call_789',
            member_id: 'member_abc',
            capabilities: ['audio', 'video'],
            origin_call_id: 'origin_123'
          }
        }
      };

      const guard = createEventRequestGuard<CallJoinedRequest>('call.joined');

      expect(guard(mockCallJoinedRequest)).toBe(true);
    });

    it('should reject requests with wrong event_type', () => {
      const mockRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'signalwire.event',
        params: {
          event_type: 'call.left', // Wrong event type
          event_channel: 'room.xyz',
          timestamp: 1234567890,
          params: {}
        }
      };

      const guard = createEventRequestGuard<CallJoinedRequest>('call.joined');

      expect(guard(mockRequest)).toBe(false);
    });

    it('should reject non-SignalWire requests', () => {
      const mockNonSWRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'other.method', // Wrong method
        params: {
          event_type: 'call.joined'
        }
      };

      const guard = createEventRequestGuard<CallJoinedRequest>('call.joined');

      expect(guard(mockNonSWRequest)).toBe(false);
    });

    it('should reject invalid objects', () => {
      const guard = createEventRequestGuard<CallJoinedRequest>('call.joined');

      expect(guard(null)).toBe(false);
      expect(guard(undefined)).toBe(false);
      expect(guard('string')).toBe(false);
      expect(guard(123)).toBe(false);
      expect(guard({})).toBe(false);
    });

    it('should work with different event types', () => {
      const mockCallLeftRequest: CallLeftRequest = {
        jsonrpc: '2.0',
        id: 'test-456',
        method: 'signalwire.event',
        params: {
          event_type: 'call.left',
          event_channel: 'room.xyz',
          timestamp: 1234567891,
          params: {
            room_session: {} as any,
            room_id: 'room_123',
            room_session_id: 'session_456',
            call_id: 'call_789',
            member_id: 'member_abc',
            origin_call_id: 'origin_123',
            reason: 'user_hangup'
          }
        }
      };

      const callLeftGuard = createEventRequestGuard<CallLeftRequest>('call.left');
      const callJoinedGuard = createEventRequestGuard<CallJoinedRequest>('call.joined');

      expect(callLeftGuard(mockCallLeftRequest)).toBe(true);
      expect(callJoinedGuard(mockCallLeftRequest)).toBe(false);
    });
  });

  describe('createEventMetadataGuard', () => {
    it('should create a guard that validates event metadata', () => {
      const mockMetadata: ExtractParams<CallJoinedRequest> = {
        event_type: 'call.joined',
        event_channel: 'room.xyz',
        timestamp: 1234567890,
        params: {
          room_session: {} as any,
          room_id: 'room_123',
          room_session_id: 'session_456',
          call_id: 'call_789',
          member_id: 'member_abc',
          capabilities: ['audio', 'video'],
          origin_call_id: 'origin_123'
        }
      };

      const guard = createEventMetadataGuard<ExtractParams<CallJoinedRequest>>('call.joined');

      expect(guard(mockMetadata)).toBe(true);
    });

    it('should reject metadata with wrong event_type', () => {
      const mockMetadata = {
        event_type: 'call.left', // Wrong event type
        event_channel: 'room.xyz',
        timestamp: 1234567890,
        params: {}
      };

      const guard = createEventMetadataGuard<ExtractParams<CallJoinedRequest>>('call.joined');

      expect(guard(mockMetadata)).toBe(false);
    });

    it('should reject invalid metadata objects', () => {
      const guard = createEventMetadataGuard<ExtractParams<CallJoinedRequest>>('call.joined');

      expect(guard(null)).toBe(false);
      expect(guard(undefined)).toBe(false);
      expect(guard('string')).toBe(false);
      expect(guard({})).toBe(false);
      expect(guard({ event_type: 'call.joined' })).toBe(false); // Missing params
    });

    it('should work with different metadata types', () => {
      const mockCallLeftMetadata: ExtractParams<CallLeftRequest> = {
        event_type: 'call.left',
        event_channel: 'room.xyz',
        timestamp: 1234567891,
        params: {
          room_session: {} as any,
          room_id: 'room_123',
          room_session_id: 'session_456',
          call_id: 'call_789',
          member_id: 'member_abc',
          origin_call_id: 'origin_123',
          reason: 'user_hangup'
        }
      };

      const callLeftGuard = createEventMetadataGuard<ExtractParams<CallLeftRequest>>('call.left');
      const callJoinedGuard =
        createEventMetadataGuard<ExtractParams<CallJoinedRequest>>('call.joined');

      expect(callLeftGuard(mockCallLeftMetadata)).toBe(true);
      expect(callJoinedGuard(mockCallLeftMetadata)).toBe(false);
    });
  });

  describe('Generated guards behavior', () => {
    it('isCallJoinedRequest should work correctly', () => {
      const mockRequest: CallJoinedRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'signalwire.event',
        params: {
          event_type: 'call.joined',
          event_channel: 'room.xyz',
          timestamp: 1234567890,
          params: {
            room_session: {} as any,
            room_id: 'room_123',
            room_session_id: 'session_456',
            call_id: 'call_789',
            member_id: 'member_abc',
            capabilities: ['audio', 'video'],
            origin_call_id: 'origin_123'
          }
        }
      };

      expect(isCallJoinedRequest(mockRequest)).toBe(true);
      expect(isCallLeftRequest(mockRequest)).toBe(false);
    });

    it('isCallJoinedMetadata should work correctly', () => {
      const mockMetadata: ExtractParams<CallJoinedRequest> = {
        event_type: 'call.joined',
        event_channel: 'room.xyz',
        timestamp: 1234567890,
        params: {
          room_session: {} as any,
          room_id: 'room_123',
          room_session_id: 'session_456',
          call_id: 'call_789',
          member_id: 'member_abc',
          capabilities: ['audio', 'video'],
          origin_call_id: 'origin_123'
        }
      };

      expect(isCallJoinedMetadata(mockMetadata)).toBe(true);
      expect(isCallLeftMetadata(mockMetadata)).toBe(false);
    });

    it('should distinguish between similar event types', () => {
      const mockMemberUpdatedRequest: MemberUpdatedRequest = {
        jsonrpc: '2.0',
        id: 'test-789',
        method: 'signalwire.event',
        params: {
          event_type: 'member.updated',
          event_channel: ['room.xyz'],
          timestamp: 1234567892,
          params: {
            member: {} as any,
            room_id: 'room_123',
            room_session_id: 'session_456'
          }
        }
      };

      // Should only match member.updated, not other member events
      expect(isMemberUpdatedRequest(mockMemberUpdatedRequest)).toBe(true);
      expect(isCallJoinedRequest(mockMemberUpdatedRequest)).toBe(false);
      expect(isCallLeftRequest(mockMemberUpdatedRequest)).toBe(false);
    });
  });

  describe('Type safety', () => {
    it('should provide correct type narrowing for Request guards', () => {
      const mockRequest: unknown = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'signalwire.event',
        params: {
          event_type: 'call.joined',
          event_channel: 'room.xyz',
          timestamp: 1234567890,
          params: {
            room_session: {} as any,
            room_id: 'room_123',
            room_session_id: 'session_456',
            call_id: 'call_789',
            member_id: 'member_abc',
            capabilities: ['audio', 'video'],
            origin_call_id: 'origin_123'
          }
        }
      };

      if (isCallJoinedRequest(mockRequest)) {
        // TypeScript should know this is CallJoinedRequest
        expect(mockRequest.params.event_type).toBe('call.joined');
        expect(mockRequest.params.params.call_id).toBe('call_789');
      }
    });

    it('should provide correct type narrowing for Metadata guards', () => {
      const mockMetadata: unknown = {
        event_type: 'call.joined',
        event_channel: 'room.xyz',
        timestamp: 1234567890,
        params: {
          room_session: {} as any,
          room_id: 'room_123',
          room_session_id: 'session_456',
          call_id: 'call_789',
          member_id: 'member_abc',
          capabilities: ['audio', 'video'],
          origin_call_id: 'origin_123'
        }
      };

      if (isCallJoinedMetadata(mockMetadata)) {
        // TypeScript should know this is CallJoinedMetadata
        expect(mockMetadata.event_type).toBe('call.joined');
        expect(mockMetadata.params.call_id).toBe('call_789');
      }
    });
  });
});
