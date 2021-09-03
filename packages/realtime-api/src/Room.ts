import {
  Rooms,
  RoomCustomMethods,
  EventTransform,
  connect,
  toExternalJSON,
  VideoMemberEventParams,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Member } from './Member'

type MemberEventMap =
  | InternalVideoMemberEventNames
  | InternalVideoMemberEventNames[]
class Room extends BaseConsumer {
  protected _eventsPrefix = 'video' as const

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
          instanceFactory: () => {
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
            })

            return member
          },
          payloadTransform: (payload: VideoMemberEventParams) => {
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
