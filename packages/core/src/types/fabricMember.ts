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
 * Public Contract for a FabricMember
 */
export interface FabricMemberContract
  extends Pick<
    VideoMemberContract,
    | 'roomSessionId'
    | 'roomId'
    | 'name'
    | 'type'
    | 'handraised'
    | 'visible'
    | 'audioMuted'
    | 'videoMuted'
    | 'deaf'
    | 'inputVolume'
    | 'outputVolume'
    | 'inputSensitivity'
    | 'meta'
  > {
  /** Unique id of this member. */
  memberId: string
  /** The ID of the call that this member is associated with */
  callId: string
  /** The ID of the node that this member is associated with */
  nodeId: string
  /** Fields that have changed for this member */
  updated?: Array<Exclude<keyof FabricMemberContract, 'updated'>>
  /** The data associated to this member subscriber */
  subscriberData?: {
    fabricSubscriberName: string
    fabricAddressId: string
    fabricSubscriberId: string
  }
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
    key as keyof InternalFabricMemberUpdatableProps
  }` as const
})

export type InternalFabricMemberUpdatableProps =
  typeof INTERNAL_MEMBER_UPDATABLE_PROPS

export type InternalFabricMemberUpdatedEventNames =
  (typeof INTERNAL_CALL_FABRIC_MEMBER_UPDATED_EVENTS)[number]

/**
 * List of public events
 */
export type FabricMemberEventNames =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  | MemberUpdatedEventNames
  | MemberTalkingEventNames
  | MemberListUpdated

/**
 * FabricMember properties
 */
export type FabricMemberEntity = OnlyStateProperties<FabricMemberContract>

/**
 * FabricMember methods
 */
export type FabricMemberMethods = OnlyFunctionProperties<FabricMemberContract>

/**
 * FabricMemberEntity entity plus `updated` field
 */
export type FabricMemberEntityUpdated = EntityUpdated<FabricMemberEntity>

/**
 * FabricMemberEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalFabricMemberEntity = {
  [K in NonNullable<
    keyof FabricMemberEntity
  > as CamelToSnakeCase<K>]: FabricMemberEntity[K]
}

/**
 * FabricMember entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export type InternalFabricMemberEntityUpdated =
  EntityUpdated<InternalFabricMemberEntity>

export interface InternalFabricMemberUpdatedEvent extends SwEvent {
  event_type: InternalFabricMemberUpdatedEventNames
  params: FabricMemberUpdatedEventParams
}

export interface InternalFabricMemberTalkingEvent extends SwEvent {
  event_type: MemberTalkingEventNames
  params: FabricMemberTalkingEventParams
}

export type InternalFabricMemberEvent =
  | InternalFabricMemberUpdatedEvent
  | InternalFabricMemberTalkingEvent

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
export interface FabricMemberJoinedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalFabricMemberEntity
}

export interface FabricMemberJoinedEvent extends SwEvent {
  event_type: MemberJoined
  params: FabricMemberJoinedEventParams
}

/**
 * 'member.updated'
 */
export interface FabricMemberUpdatedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalFabricMemberEntityUpdated
}

export interface FabricMemberUpdatedEvent extends SwEvent {
  event_type: MemberUpdated
  params: FabricMemberUpdatedEventParams
}

/**
 * 'member.left'
 */
export interface FabricMemberLeftEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalFabricMemberEntity
}

export interface FabricMemberLeftEvent extends SwEvent {
  event_type: MemberLeft
  params: FabricMemberLeftEventParams
}

/**
 * 'member.talking'
 */
export interface FabricMemberTalkingEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  member: InternalFabricMemberEntity
}

export interface FabricMemberTalkingEvent extends SwEvent {
  event_type: MemberTalking
  params: FabricMemberTalkingEventParams
}

export type FabricMemberEvent =
  | FabricMemberJoinedEvent
  | FabricMemberLeftEvent
  | FabricMemberUpdatedEvent
  | FabricMemberTalkingEvent

export type FabricMemberEventParams =
  | FabricMemberJoinedEventParams
  | FabricMemberLeftEventParams
  | FabricMemberUpdatedEventParams
  | FabricMemberTalkingEventParams
