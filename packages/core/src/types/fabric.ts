import { MapToPubSubShape } from '../redux/interfaces'
import {
  ProgrammableCallsLayoutEvent,
  ProgrammableCallsLayoutEventNames,
  ProgrammableCallsLayoutEventParams,
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
export type ProgrammableCallsEventNames =
  | CallSessionEventNames
  | MemberEventNames
  | ProgrammableCallsLayoutEventNames

export type ProgrammableCallsEvent =
  | CallSessionEvent
  | MemberEvent
  | ProgrammableCallsLayoutEvent

export type ProgrammableCallsEventParams =
  | CallSessionEventParams
  | MemberEventParams
  | ProgrammableCallsLayoutEventParams

export type ProgrammableCallsAction = MapToPubSubShape<ProgrammableCallsEvent>
