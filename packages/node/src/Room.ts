import { Rooms, RoomCustomMethods } from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'

class Room extends BaseConsumer {
  protected _eventsPrefix = 'video.' as const

  // This is needed for the custom methods.
  roomSessionId = this.options.namespace

  /**
   * Converts events like `member.joined` into `video.member.joined`
   * @internal
   */
  protected getSubscriptions(): (string | symbol)[] {
    return this.originalEventNames().map((eventName) => {
      if (typeof eventName === 'string') {
        return this._getPrefixedEvent(eventName)
      }

      return eventName
    })
  }
}

const customMethods: RoomCustomMethods<any> = {
  // TODO: add remaining methods
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  getMembers: Rooms.getMembers,
}
Object.defineProperties(Room.prototype, customMethods)

export { Room }
