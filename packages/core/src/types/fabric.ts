import { MapToPubSubShape } from '../redux/interfaces'
import {
  UCallLayoutEvent,
  UCallLayoutEventNames,
  UCallLayoutEventParams,
} from './fabricLayout'
import {
  MemberEvent,
  MemberEventNames,
  MemberEventParams,
} from './fabricMember'
import {
  CallSessionEvent,
  CallSessionEventNames,
  CallSessionEventParams,
} from './fabricRoomSession'

export * from './fabricRoomSession'
export * from './fabricMember'
export * from './fabricLayout'

/**
 * List of all call fabric events
 */
export type CallEventNames =
  | CallSessionEventNames
  | MemberEventNames
  | UCallLayoutEventNames

export type CallEvent = CallSessionEvent | MemberEvent | UCallLayoutEvent

export type CallEventParams =
  | CallSessionEventParams
  | MemberEventParams
  | UCallLayoutEventParams

export type UCallAction = MapToPubSubShape<CallEvent>
