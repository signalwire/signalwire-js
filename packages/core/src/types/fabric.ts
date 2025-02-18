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

export interface CapabilityOnOffState {
  on: boolean
  off: boolean
}

export interface MemberCapability {
  muteAudio: CapabilityOnOffState
  muteVideo: CapabilityOnOffState
  microphoneVolume: boolean
  microphoneSensitivity: boolean
  speakerVolume: boolean
  deaf: CapabilityOnOffState
  raisehand: CapabilityOnOffState
  position: boolean
  meta: boolean
  remove: boolean
}

export interface CallCapabilities {
  self: MemberCapability
  member: MemberCapability
  end: boolean
  setLayout: boolean
  sendDigit: boolean
  vmutedHide: CapabilityOnOffState
  lock: CapabilityOnOffState
  device: boolean
  screenshare: boolean
}

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
