import {
  CamelToSnakeCase,
  EntityUpdated,
  MemberJoined,
  MemberLeft,
  MemberListUpdated,
  MemberTalking,
  MemberTalkingEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  OnlyFunctionProperties,
  OnlyStateProperties,
  SwEvent,
  VideoMemberContract,
} from '..'

// TODO: Finish the Call Fabric member contract.
// Omit VideoMemberContract properties which are not offered in CF SDK

/**
 * Public Contract for a CallFabricMember
 */
export interface CallFabricMemberContract extends VideoMemberContract {
  /** The ID of the call that this member is associated with */
  callId?: string
  /** The ID of the node that this member is associated with */
  nodeId?: string
  /** Unique id of this member. */
  memberId?: string
}

/**
 * Used to not duplicate member fields across constants and types
 * and generate `MEMBER_UPDATED_EVENTS` below.
 * `key`: `type`
 */
const INTERNAL_MEMBER_UPDATABLE_PROPS = {
  audio_muted: true,
  video_muted: true,
  deaf: true,
  visible: true,
  input_volume: 1,
  output_volume: 1,
  input_sensitivity: 1,
}

export const INTERNAL_CALL_FABRIC_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${
    key as keyof InternalCallFabricMemberUpdatableProps
  }` as const
})

export type InternalCallFabricMemberUpdatableProps =
  typeof INTERNAL_MEMBER_UPDATABLE_PROPS

export type InternalCallFabricMemberUpdatedEventNames =
  (typeof INTERNAL_CALL_FABRIC_MEMBER_UPDATED_EVENTS)[number]

/**
 * List of public events
 */
export type CallFabricMemberEventNames =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  | MemberUpdatedEventNames
  | MemberTalkingEventNames
  | MemberListUpdated

/**
 * CallFabricMember properties
 */
export type CallFabricMemberEntity =
  OnlyStateProperties<CallFabricMemberContract>

/**
 * CallFabricMember methods
 */
export type CallFabricMemberMethods =
  OnlyFunctionProperties<CallFabricMemberContract>

/**
 * CallFabricMemberEntity entity plus `updated` field
 */
export type CallFabricMemberEntityUpdated =
  EntityUpdated<CallFabricMemberEntity>

/**
 * CallFabricMemberEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalCallFabricMemberEntity = {
  [K in NonNullable<
    keyof CallFabricMemberEntity
  > as CamelToSnakeCase<K>]: CallFabricMemberEntity[K]
}

/**
 * CallFabricMember entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export type InternalCallFabricMemberEntityUpdated =
  EntityUpdated<InternalCallFabricMemberEntity>

export interface InternalCallFabricMemberUpdatedEvent extends SwEvent {
  event_type: InternalCallFabricMemberUpdatedEventNames
  params: CallFabricMemberUpdatedEventParams
}

export interface InternalCallFabricMemberTalkingEvent extends SwEvent {
  event_type: MemberTalkingEventNames
  params: CallFabricMemberTalkingEventParams
}

export type InternalCallFabricMemberEvent =
  | InternalCallFabricMemberUpdatedEvent
  | InternalCallFabricMemberTalkingEvent

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'member.joined'
 */
export interface CallFabricMemberJoinedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalCallFabricMemberEntity
}

export interface CallFabricMemberJoinedEvent extends SwEvent {
  event_type: MemberJoined
  params: CallFabricMemberJoinedEventParams
}

/**
 * 'member.updated'
 */
export interface CallFabricMemberUpdatedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalCallFabricMemberEntityUpdated
}

export interface CallFabricMemberUpdatedEvent extends SwEvent {
  event_type: MemberUpdated
  params: CallFabricMemberUpdatedEventParams
}

/**
 * 'member.left'
 */
export interface CallFabricMemberLeftEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalCallFabricMemberEntity
}

export interface CallFabricMemberLeftEvent extends SwEvent {
  event_type: MemberLeft
  params: CallFabricMemberLeftEventParams
}

/**
 * 'member.talking'
 */
export interface CallFabricMemberTalkingEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalCallFabricMemberEntity
}

export interface CallFabricMemberTalkingEvent extends SwEvent {
  event_type: MemberTalking
  params: CallFabricMemberTalkingEventParams
}

export type CallFabricMemberEvent =
  | CallFabricMemberJoinedEvent
  | CallFabricMemberLeftEvent
  | CallFabricMemberUpdatedEvent
  | CallFabricMemberTalkingEvent

export type CallFabricMemberEventParams =
  | CallFabricMemberJoinedEventParams
  | CallFabricMemberLeftEventParams
  | CallFabricMemberUpdatedEventParams
  | CallFabricMemberTalkingEventParams
