import { MapToPubSubShape } from '../redux/interfaces'
import {
  FabricLayoutEvent,
  FabricLayoutEventNames,
  FabricLayoutEventParams,
} from './fabricLayout'
import {
  MemberEvent,
  MemberEventNames,
  MemberEventParams,
} from './fabricMember'
import {
  FabricRoomEvent,
  FabricRoomEventNames,
  FabricRoomEventParams,
} from './fabricRoomSession'

export * from './fabricRoomSession'
export * from './fabricMember'
export * from './fabricLayout'

/**
 * List of all call fabric events
 */
export type FabricEventNames =
  | FabricRoomEventNames
  | MemberEventNames
  | FabricLayoutEventNames

export type FabricEvent = FabricRoomEvent | MemberEvent | FabricLayoutEvent

export type FabricEventParams =
  | FabricRoomEventParams
  | MemberEventParams
  | FabricLayoutEventParams

export type FabricAction = MapToPubSubShape<FabricEvent>
