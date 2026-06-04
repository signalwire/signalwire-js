// =============================================================================
// ENTITY TYPE GUARDS
// =============================================================================
// This file contains type guards for common entity types like Member,
// RoomSession, Layout, etc.

import { hasProperty, isObject } from './base.guards';

import type { Layout, LayoutLayer, Member, RoomSession } from '../types/common';

// =============================================================================
// ENTITY TYPE GUARDS
// =============================================================================

export function isMember(value: unknown): value is Member {
  return (
    isObject(value) &&
    hasProperty(value, 'member_id') &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'room_session_id') &&
    hasProperty(value, 'type') &&
    (value.type === 'member' || value.type === 'screen')
  );
}

export function isRoomSession(value: unknown): value is RoomSession {
  return (
    isObject(value) &&
    hasProperty(value, 'room_session_id') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'members') &&
    Array.isArray(value.members)
  );
}

export function isLayout(value: unknown): value is Layout {
  return (
    isObject(value) &&
    hasProperty(value, 'layers') &&
    Array.isArray(value.layers) &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'name')
  );
}

export function isLayoutLayer(value: unknown): value is LayoutLayer {
  return (
    isObject(value) &&
    hasProperty(value, 'layer_index') &&
    hasProperty(value, 'z_index') &&
    hasProperty(value, 'position')
  );
}
