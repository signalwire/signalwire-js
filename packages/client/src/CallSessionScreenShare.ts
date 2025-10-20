import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
  RoomLeft,
  RoomLeftEventParams,
  BaseConnectionState,
} from '@signalwire/core'
import { BaseConnection, MediaEventNames } from '@signalwire/webrtc'
import { CallSessionScreenShareMethods } from './utils/interfaces'

type CallSessionScreenShareEventsHandlerMap = Record<
  BaseConnectionState,
  (params: CallSessionScreenShare) => void
> &
  Record<RoomLeft, (params?: RoomLeftEventParams) => void> &
  Record<MediaEventNames, () => void>

export type CallSessionScreenShareEvents = {
  [k in keyof CallSessionScreenShareEventsHandlerMap]: CallSessionScreenShareEventsHandlerMap[k]
}

/** @deprecated Use {@link CallSessionScreenShare} instead */
export interface RoomScreenShare extends CallSessionScreenShare {}
export interface CallSessionScreenShare
  extends CallSessionScreenShareMethods,
    BaseConnectionContract<CallSessionScreenShareEvents> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<CallSessionScreenShareEvents>['runWorker']
}

export class CallSessionScreenShareConnection extends BaseConnection<CallSessionScreenShareEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

/**
 * Represents a screen sharing.
 */
export const CallSessionScreenShareAPI = extendComponent<
  CallSessionScreenShareConnection,
  CallSessionScreenShareMethods
>(CallSessionScreenShareConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
