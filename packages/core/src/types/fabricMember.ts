import { SwEvent } from '.'
import { toExternalJSON } from '..'
import {
  CamelToSnakeCase,
  EntityUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
  SnakeToCamelCase,
} from './utils'
import {
  MemberJoined,
  MemberLeft,
  MemberListUpdated,
  MemberTalking,
  MemberUpdated,
  CoreMemberUpdatedEventNames,
  VideoMemberContract,
} from './videoMember'

/**
 * Public Contract for a Member
 */
export interface MemberContract extends MemberBaseProps, MemberUpdatableProps {
  /** Provides the member id of the member itself, may be the same as call_id for call legs outside of a conference */
  memberId: string
  /** Provides the call id the member was created through */
  callId: string
  /** Provides the node id the member exists on */
  nodeId: string
  /** Provides the subscriber ID for the member */
  subscriberId: string
  /** Provides the address ID for the member */
  addressId: string
}

type MemberBaseProps = Pick<
  VideoMemberContract,
  | 'roomSessionId'
  | 'roomId'
  | 'name'
  | 'parentId'
  | 'type'
  | 'requestedPosition'
  | 'currentPosition'
  | 'meta'
  | 'talking'
>

/**
 * Used to not duplicate member fields across constants and types
 * and generate `MEMBER_UPDATED_EVENTS` below.
 * `key`: `type`
 */
export const INTERNAL_FABRIC_MEMBER_UPDATABLE_PROPS = {
  audio_muted: true,
  video_muted: true,
  deaf: true,
  visible: true,
  input_volume: 1,
  output_volume: 1,
  input_sensitivity: 1,
  handraised: true,
  echo_cancellation: true,
  auto_gain: true,
  noise_suppression: true,
}

export type InternalMemberUpdatableProps =
  typeof INTERNAL_FABRIC_MEMBER_UPDATABLE_PROPS

export const INTERNAL_FABRIC_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_FABRIC_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${key as keyof InternalMemberUpdatableProps}` as const
})

export type InternalMemberUpdatedEventNames =
  (typeof INTERNAL_FABRIC_MEMBER_UPDATED_EVENTS)[number]

export type MemberUpdatableProps = {
  [K in keyof InternalMemberUpdatableProps as SnakeToCamelCase<K>]: InternalMemberUpdatableProps[K]
}

export const FABRIC_MEMBER_UPDATABLE_PROPS: MemberUpdatableProps =
  toExternalJSON(INTERNAL_FABRIC_MEMBER_UPDATABLE_PROPS)

export const FABRIC_MEMBER_UPDATED_EVENTS = Object.keys(
  FABRIC_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${key as keyof MemberUpdatableProps}` as const
})

export type MemberUpdatedEventNames =
  (typeof FABRIC_MEMBER_UPDATED_EVENTS)[number]

/**
 * Member properties
 */
export type MemberEntity = OnlyStateProperties<MemberContract>

/**
 * Member methods
 */
export type MemberMethods = OnlyFunctionProperties<MemberContract>

/**
 * MemberEntity entity plus `updated` field
 */
export type MemberEntityUpdated = EntityUpdated<MemberEntity>

/**
 * MemberEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalMemberEntity = {
  [K in NonNullable<keyof MemberEntity> as CamelToSnakeCase<K>]: MemberEntity[K]
}

/**
 * Member entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export type InternalMemberEntityUpdated = EntityUpdated<InternalMemberEntity>

export interface InternalMemberUpdatedEvent extends SwEvent {
  event_type: InternalMemberUpdatedEventNames
  params: MemberUpdatedEventParams
}

export interface InternalMemberListUpdatedEvent extends SwEvent {
  event_type: MemberListUpdated
  params: MemberUpdatedEventParams
}

export type InternalMemberEventNames =
  | CoreMemberUpdatedEventNames
  | MemberListUpdated

export type InternalMemberEvent =
  | InternalMemberUpdatedEvent
  | InternalMemberListUpdatedEvent

export type InternalMemberEventParams =
  | MemberUpdatedEventParams
  | MemberUpdatedEventParams

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * member.joined
 */
export interface MemberJoinedEventParams {
  member: InternalMemberEntity
  room_id: string
  room_session_id: string
}

export interface MemberJoinedEvent extends SwEvent {
  event_type: MemberJoined
  params: MemberJoinedEventParams
}

/**
 * member.updated
 */
export interface MemberUpdatedEventParams {
  member: InternalMemberEntityUpdated
  room_id: string
  room_session_id: string
}

export interface MemberUpdatedEvent extends SwEvent {
  event_type: MemberUpdated
  params: MemberUpdatedEventParams
}

/**
 * member.left
 */
export interface MemberLeftEventParams {
  member: InternalMemberEntity
  room_id: string
  room_session_id: string
  reason: string
}

export interface MemberLeftEvent extends SwEvent {
  event_type: MemberLeft
  params: MemberLeftEventParams
}

/**
 * member.talking
 */
export interface MemberTalkingEventParams {
  room_id: string
  room_session_id: string
  member: {
    member_id: string
    talking: boolean
    node_id: string
  }
}

export interface MemberTalkingEvent extends SwEvent {
  event_type: MemberTalking
  params: MemberTalkingEventParams
}

export type MemberEventNames =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  | MemberTalking

export type MemberEvent =
  | MemberJoinedEvent
  | MemberLeftEvent
  | MemberUpdatedEvent
  | MemberTalkingEvent

export type MemberEventParams =
  | MemberJoinedEventParams
  | MemberLeftEventParams
  | MemberUpdatedEventParams
  | MemberTalkingEventParams

export type MemberEventParamsExcludeTalking = Exclude<
  MemberEventParams,
  MemberTalkingEventParams
>
