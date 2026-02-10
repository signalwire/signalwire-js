import { MapToPubSubShape } from '../redux/interfaces'
import {
  FabricLayoutEvent,
  FabricLayoutEventNames,
  FabricLayoutEventParams,
} from './fabricLayout'
import {
  FabricMemberEvent,
  FabricMemberEventNames,
  FabricMemberEventParams,
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
  | FabricMemberEventNames
  | FabricLayoutEventNames

export type FabricEvent =
  | FabricRoomEvent
  | FabricMemberEvent
  | FabricLayoutEvent

export type FabricEventParams =
  | FabricRoomEventParams
  | FabricMemberEventParams
  | FabricLayoutEventParams

export type FabricAction = MapToPubSubShape<FabricEvent>
