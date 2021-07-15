import { compose } from 'redux'
import { BaseConnection } from '@signalwire/webrtc'
import {
  withBaseRoomMethods,
  withRoomMemberMethods,
  RoomDeviceConstructor,
} from './features/mixins'

const RoomDeviceMixin = compose<RoomDeviceConstructor>(
  withBaseRoomMethods,
  withRoomMemberMethods
)(BaseConnection)

export class RoomDevice extends RoomDeviceMixin {}
