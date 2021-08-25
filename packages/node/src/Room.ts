import {
  Rooms,
  RoomCustomMethods,
  EventTransform,
  connect,
  toExternalJSON,
  MemberEventParams,
  InternalMemberEvent,
  INTERNAL_MEMBER_UPDATED_EVENTS,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Member } from './Member'

type MemberEventMap = InternalMemberEvent | InternalMemberEvent[]
class Room extends BaseConsumer {
  protected _eventsPrefix = 'video' as const

  // This is needed for the custom methods.
  roomSessionId = this.options.namespace

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<MemberEventMap, EventTransform>([
      [
        [
          'video.member.joined',
          'video.member.left',
          'video.member.talking',
          'video.member.talking.start',
          'video.member.talking.stop',
          'video.member.updated',
          ...INTERNAL_MEMBER_UPDATED_EVENTS,
        ],
        {
          instanceFactory: (payload: MemberEventParams) => {
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
              params: payload,
            })

            return member
          },
          payloadTransform: (payload: MemberEventParams) => {
            return toExternalJSON(payload.member)
          },
        },
      ],
    ])
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
