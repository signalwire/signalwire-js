import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
  BaseConnectionState,
  RoomLeft,
  RoomLeftEventParams,
  EventEmitter,
} from '@signalwire/core'
import { BaseConnection, MediaEvent } from '@signalwire/webrtc'
import { RoomScreenShareMethods } from './utils/interfaces'

type RoomSessionScreenShareEventsHandlerMap = Record<
  BaseConnectionState,
  (params: RoomSessionScreenShare) => void
> &
  Record<RoomLeft, (params?: RoomLeftEventParams) => void> &
  Record<MediaEvent, () => void>

export type RoomSessionScreenShareEvents = {
  [k in keyof RoomSessionScreenShareEventsHandlerMap]: RoomSessionScreenShareEventsHandlerMap[k]
}

/** @deprecated Use {@link RoomSessionScreenShare} instead */
export interface RoomScreenShare extends RoomSessionScreenShare {}
export interface RoomSessionScreenShare
  extends RoomScreenShareMethods,
    BaseConnectionContract<RoomSessionScreenShareEvents> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<RoomSessionScreenShareEvents>['runWorker']
}

export class RoomSessionScreenShareConnection extends BaseConnection<RoomSessionScreenShareEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }

  override on<T extends EventEmitter.EventNames<RoomSessionScreenShareEvents>>(
    event: T,
    fn: EventEmitter.EventListener<RoomSessionScreenShareEvents, any>
  ) {
    return super._on(event, fn)
  }

  override once<
    T extends EventEmitter.EventNames<RoomSessionScreenShareEvents>
  >(
    event: T,
    fn: EventEmitter.EventListener<RoomSessionScreenShareEvents, any>
  ) {
    return super._once(event, fn)
  }

  override off<T extends EventEmitter.EventNames<RoomSessionScreenShareEvents>>(
    event: T,
    fn: EventEmitter.EventListener<RoomSessionScreenShareEvents, any>
  ) {
    return super._off(event, fn)
  }
}

/**
 * Represents a screen sharing.
 */
export const RoomSessionScreenShareAPI = extendComponent<
  RoomSessionScreenShareConnection,
  RoomScreenShareMethods
>(RoomSessionScreenShareConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
