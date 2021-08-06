import { Rooms, RoomCustomMethods } from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'

// TODO: add events
type RoomEvents = any

class Room extends BaseConsumer<RoomEvents> {
  // This is needed for the custom methods.
  roomSessionId = this.options.namespace
}

const customMethods: RoomCustomMethods<any> = {
  // TODO: add remaining methods
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  getMembers: Rooms.getMembers,
}
Object.defineProperties(Room.prototype, customMethods)

export { Room }
