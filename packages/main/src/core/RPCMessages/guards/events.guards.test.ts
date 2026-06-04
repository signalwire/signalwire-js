import { describe, it, expect } from 'vitest';
import {
  isRoomUpdatedRequest,
  isRoomUpdatedMetadata,
  isRoomUpdatedPayload,
  isSignalwireCallRequest,
  isSignalwireCallMetadata
} from './events.guards';
import type { RoomUpdatedPayload } from '../types/events';

const validRoomSession = {
  room_session_id: 'rs-123',
  room_id: 'room-456',
  event_channel: 'ec-789',
  name: 'test-room',
  layout_name: 'grid-responsive',
  display_name: 'Test Room',
  recording: false,
  streaming: false,
  prioritize_handraise: false,
  hide_video_muted: false,
  locked: true,
  meta: {},
  members: [],
  recordings: [],
  streams: [],
  playbacks: []
};

const validRoomUpdatedPayload: RoomUpdatedPayload = {
  room_session: validRoomSession,
  room_id: 'room-456',
  room_session_id: 'rs-123'
};

const validRoomUpdatedRequest = {
  jsonrpc: '2.0' as const,
  id: 'req-1',
  method: 'signalwire.event' as const,
  params: {
    event_type: 'room.updated' as const,
    event_channel: 'ec-789',
    timestamp: 1234567890,
    params: validRoomUpdatedPayload
  }
};

const validRoomUpdatedMetadata = validRoomUpdatedRequest.params;

describe('room.updated guards', () => {
  describe('isRoomUpdatedPayload', () => {
    it('should return true for a valid room.updated payload', () => {
      expect(isRoomUpdatedPayload(validRoomUpdatedPayload)).toBe(true);
    });

    it('should return false for payload missing room_session', () => {
      const { room_session: _, ...noRoomSession } = validRoomUpdatedPayload;
      expect(isRoomUpdatedPayload(noRoomSession)).toBe(false);
    });

    it('should return false for payload missing room_id', () => {
      const { room_id: _, ...noRoomId } = validRoomUpdatedPayload;
      expect(isRoomUpdatedPayload(noRoomId)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRoomUpdatedPayload(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRoomUpdatedPayload(undefined)).toBe(false);
    });
  });

  describe('isRoomUpdatedRequest', () => {
    it('should return true for a valid room.updated request', () => {
      expect(isRoomUpdatedRequest(validRoomUpdatedRequest)).toBe(true);
    });

    it('should return false for a request with wrong event_type', () => {
      const wrongType = {
        ...validRoomUpdatedRequest,
        params: { ...validRoomUpdatedRequest.params, event_type: 'call.joined' }
      };
      expect(isRoomUpdatedRequest(wrongType)).toBe(false);
    });

    it('should return false for a non-signalwire.event method', () => {
      const wrongMethod = { ...validRoomUpdatedRequest, method: 'verto.invite' };
      expect(isRoomUpdatedRequest(wrongMethod)).toBe(false);
    });
  });

  describe('isRoomUpdatedMetadata', () => {
    it('should return true for valid room.updated metadata', () => {
      expect(isRoomUpdatedMetadata(validRoomUpdatedMetadata)).toBe(true);
    });

    it('should return false for metadata with wrong event_type', () => {
      const wrongType = { ...validRoomUpdatedMetadata, event_type: 'call.joined' };
      expect(isRoomUpdatedMetadata(wrongType)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRoomUpdatedMetadata(null)).toBe(false);
    });
  });

  describe('isSignalwireCallRequest includes room.updated', () => {
    it('should return true for a room.updated request', () => {
      expect(isSignalwireCallRequest(validRoomUpdatedRequest)).toBe(true);
    });
  });

  describe('isSignalwireCallMetadata includes room.updated', () => {
    it('should return true for room.updated metadata', () => {
      expect(isSignalwireCallMetadata(validRoomUpdatedMetadata)).toBe(true);
    });
  });
});
