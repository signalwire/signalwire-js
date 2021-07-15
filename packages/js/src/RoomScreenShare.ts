import { compose } from 'redux'
import { BaseConnection } from '@signalwire/webrtc'
import {
  withBaseRoomMethods,
  withRoomMemberMethods,
  RoomScreenShareConstructor,
} from './features/mixins'

const RoomScreenShareMixin = compose<RoomScreenShareConstructor>(
  withBaseRoomMethods,
  withRoomMemberMethods
)(BaseConnection)

export class RoomScreenShare extends RoomScreenShareMixin {}
