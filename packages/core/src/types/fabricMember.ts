import { SwEvent } from '.'
import {
  CamelToSnakeCase,
  EntityUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
} from './utils'
import {
  MemberJoined,
  MemberLeft,
  MemberListUpdated,
  MemberTalking,
  MemberUpdated,
  MemberUpdatedEventNames,
  VideoMemberContract,
} from './videoMember'

/**
 * Public Contract for a FabricMember
 */
export interface FabricMemberContract
  extends FabricMemberBaseProps,
    FabricMemberUpdatableProps {
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

type FabricMemberBaseProps = Pick<
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
const FABRIC_MEMBER_UPDATABLE_PROPS = {
  audioMuted: true,
  videoMuted: true,
  deaf: true,
  visible: true,
  inputVolume: 1,
  outputVolume: 1,
  inputSensitivity: 1,
  handraised: true,
  echoCancellation: true,
  autoGain: true,
  noiseSuppression: true,
}

export const FABRIC_MEMBER_UPDATED_EVENTS = Object.keys(
  FABRIC_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${key as keyof FabricMemberUpdatableProps}` as const
})

export type FabricMemberUpdatableProps = typeof FABRIC_MEMBER_UPDATABLE_PROPS

export type InternalFabricMemberUpdatedEventNames =
  (typeof FABRIC_MEMBER_UPDATED_EVENTS)[number]

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

export interface InternalFabricMemberListUpdatedEvent extends SwEvent {
  event_type: MemberListUpdated
  params: FabricMemberUpdatedEventParams
}

export type InternalFabricMemberEventNames =
  | MemberUpdatedEventNames
  | MemberListUpdated

export type InternalFabricMemberEvent =
  | InternalFabricMemberUpdatedEvent
  | InternalFabricMemberListUpdatedEvent

export type InternalFabricMemberEventParams =
  | FabricMemberUpdatedEventParams
  | FabricMemberUpdatedEventParams

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
export interface FabricMemberJoinedEventParams {
  member: InternalFabricMemberEntity
  room_id: string
  room_session_id: string
}

export interface FabricMemberJoinedEvent extends SwEvent {
  event_type: MemberJoined
  params: FabricMemberJoinedEventParams
}

/**
 * member.updated
 */
export interface FabricMemberUpdatedEventParams {
  member: InternalFabricMemberEntityUpdated
  room_id: string
  room_session_id: string
}

export interface FabricMemberUpdatedEvent extends SwEvent {
  event_type: MemberUpdated
  params: FabricMemberUpdatedEventParams
}

/**
 * member.left
 */
export interface FabricMemberLeftEventParams {
  member: InternalFabricMemberEntity
  room_id: string
  room_session_id: string
  reason: string
}

export interface FabricMemberLeftEvent extends SwEvent {
  event_type: MemberLeft
  params: FabricMemberLeftEventParams
}

/**
 * member.talking
 */
export interface FabricMemberTalkingEventParams {
  room_id: string
  room_session_id: string
  member: {
    member_id: string
    talking: boolean
    node_id: string
  }
}

export interface FabricMemberTalkingEvent extends SwEvent {
  event_type: MemberTalking
  params: FabricMemberTalkingEventParams
}

export type FabricMemberEventNames =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  | MemberTalking

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

export type FabricMemberEventParamsExcludeTalking = Exclude<
  FabricMemberEventParams,
  FabricMemberTalkingEventParams
>
