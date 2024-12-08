import { MapToPubSubShape } from '../redux/interfaces'
import { FabricLayoutEvent, FabricLayoutEventParams } from './fabricLayout'
import { FabricMemberEvent, FabricMemberEventParams } from './fabricMember'
import { FabricRoomEvent, FabricRoomEventParams } from './fabricRoomSession'

export type FabricEvent =
  | FabricRoomEvent
  | FabricMemberEvent
  | FabricLayoutEvent

export type FabricEventParams =
  | FabricRoomEventParams
  | FabricMemberEventParams
  | FabricLayoutEventParams

export type FabricAction = MapToPubSubShape<FabricEvent>

interface CapabilityOnOffState {
  on?: true
  off?: true
}

interface MemberCapability {
  muteAudio?: CapabilityOnOffState
  muteVideo?: CapabilityOnOffState
  microphoneVolume?: true
  microphoneSensitivity?: true
  speakerVolume?: true
  deaf?: CapabilityOnOffState
  raisehand?: CapabilityOnOffState
  position?: true
  meta?: true
  remove?: true
}

export interface CallCapabilities {
  self?: MemberCapability
  member?: MemberCapability
  end?: true
  setLayout?: true
  sendDigit?: true
  vmutedHide?: CapabilityOnOffState
  lock?: CapabilityOnOffState
  device?: true
  screenshare?: true
}
