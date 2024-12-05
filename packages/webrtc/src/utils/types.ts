import {
  BaseConnectionState,
  VideoRoomDeviceEventParams,
  VideoRoomDeviceEventNames,
} from '@signalwire/core'

export interface OnVertoByeParams {
  byeCause: string
  byeCauseCode: string
  rtcPeerId: string
  redirectDestination?: string
}

export type MediaEventNames =
  | 'media.connected'
  | 'media.reconnecting'
  | 'media.disconnected'

type BaseConnectionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: any) => void
> &
  Record<MediaEventNames, () => void> &
  Record<
    VideoRoomDeviceEventNames,
    (params: VideoRoomDeviceEventParams) => void
  >

export type BaseConnectionEvents = {
  [k in keyof BaseConnectionEventsHandlerMap]: BaseConnectionEventsHandlerMap[k]
}
