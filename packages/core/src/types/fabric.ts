import { MapToPubSubShape } from '../redux/interfaces'
import {
  CallLayoutEvent,
  CallLayoutEventNames,
  CallLayoutEventParams,
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
  | CallLayoutEventNames

export type CallEvent = CallSessionEvent | MemberEvent | CallLayoutEvent

export type CallEventParams =
  | CallSessionEventParams
  | MemberEventParams
  | CallLayoutEventParams

export type CallAction = MapToPubSubShape<CallEvent>
