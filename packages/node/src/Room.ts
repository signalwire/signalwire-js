import {
  Rooms,
  RoomCustomMethods,
  connect,
  INTERNAL_MEMBER_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_TALKING_EVENTS,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Member } from './Member'

class Room extends BaseConsumer {
  protected _eventsPrefix = 'video' as const

  // This is needed for the custom methods.
  roomSessionId = this.options.namespace

  /** @internal */
  protected _emitterTransforms = new Map<any, any>([
    ...INTERNAL_MEMBER_EVENTS.map((event) => {
      return [event, this._memberEventsHandler()] as any
    }),
    // TODO: We may want to use "updated" with a different handler
    ...INTERNAL_MEMBER_UPDATED_EVENTS.map((event) => {
      return [event, this._memberEventsHandler()] as any
    }),
    // TODO: We may want to use "talking" with a different handler
    ...INTERNAL_MEMBER_TALKING_EVENTS.map((event) => {
      return [event, this._memberEventsHandler()] as any
    }),
  ])

  private _memberEventsHandler() {
    return (handler: any) => (payload: any) => {
      try {
        const member: Member = connect({
          store: this.store,
          Component: Member,
          componentListeners: {
            errors: 'onError',
            responses: 'onSuccess',
          },
        })({
          store: this.store,
          emitter: this.options.emitter,
          // TODO: better define how we wanna pass payloads
          ...payload,
        })

        return handler(member)
      } catch (error) {
        console.error('>> Error', error)
      }
    }
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
