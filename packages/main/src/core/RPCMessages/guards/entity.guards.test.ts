import { describe, it, expect } from 'vitest';

import { isMember } from './entity.guards';

describe('isMember', () => {
  const baseMember = {
    member_id: 'member-id-1',
    call_id: 'call-id-1',
    room_session_id: 'room-session-id-1',
  };

  it('should return true for a member with type "member"', () => {
    expect(isMember({ ...baseMember, type: 'member' })).toBe(true);
  });

  it('should return true for a member with type "screen"', () => {
    expect(isMember({ ...baseMember, type: 'screen' })).toBe(true);
  });

  it('should return true for a member with type "device" (conference)', () => {
    expect(isMember({ ...baseMember, type: 'device' })).toBe(true);
  });

  it('should return true for a member with an unknown future kind', () => {
    expect(isMember({ ...baseMember, type: 'something-new' })).toBe(true);
  });

  it('should return false when type is not a string', () => {
    expect(isMember({ ...baseMember, type: 123 })).toBe(false);
    expect(isMember({ ...baseMember, type: null })).toBe(false);
  });

  it('should return false when type is missing', () => {
    expect(isMember(baseMember)).toBe(false);
  });

  it('should return false when member_id is missing', () => {
    const { member_id: _member_id, ...rest } = baseMember;
    expect(isMember({ ...rest, type: 'member' })).toBe(false);
  });

  it('should return false when call_id is missing', () => {
    const { call_id: _call_id, ...rest } = baseMember;
    expect(isMember({ ...rest, type: 'member' })).toBe(false);
  });

  it('should return false when room_session_id is missing', () => {
    const { room_session_id: _room_session_id, ...rest } = baseMember;
    expect(isMember({ ...rest, type: 'member' })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isMember(null)).toBe(false);
    expect(isMember(undefined)).toBe(false);
    expect(isMember('member')).toBe(false);
    expect(isMember(123)).toBe(false);
    expect(isMember({})).toBe(false);
  });
});
