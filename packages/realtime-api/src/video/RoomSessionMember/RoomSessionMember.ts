import {
  extendComponent,
  VideoMemberContract,
  VideoMemberMethods,
  EntityUpdated,
  VideoMemberJoinedEventParams,
  VideoMemberLeftEventParams,
  VideoMemberUpdatedEventParams,
  VideoMemberTalkingEventParams,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { RoomMethods } from '../methods'
import type { Client } from '../../client/Client'

/**
 * Represents a member of a room session. You receive instances of this type by
 * listening to room events, for example on a {@link RoomSession} object.
 *
 * > ℹ️ State of RoomSessionMember objects
 * >
 * > The state of RoomSessionMember objects, for example `member.visible`, is
 * > immutable. When you receive instances of RoomSessionMember from event
 * > listeners, the state of the member always refers to that specific point in
 * > time and remains fixed for the whole lifetime of the object.
 */
export interface RoomSessionMember extends VideoMemberContract {
  setPayload(payload: RoomSessionMemberEventParams): void
}
export type RoomSessionMemberUpdated = EntityUpdated<RoomSessionMember>

export type RoomSessionMemberEventParams =
  | (
      | VideoMemberJoinedEventParams
      | VideoMemberLeftEventParams
      | VideoMemberUpdatedEventParams
    ) &
      VideoMemberTalkingEventParams

export interface RoomSessionOptions {
  roomSession: RoomSession
  payload: RoomSessionMemberEventParams
}

export class RoomSessionMember {
  private _client: Client
  private _payload: RoomSessionMemberEventParams

  constructor(options: RoomSessionOptions) {
    this._client = options.roomSession._sw.client
    this._payload = options.payload
  }

  get id() {
    return this._payload.member.id
  }

  get memberId() {
    return this._payload.member.id
  }

  get roomSessionId() {
    return this._payload.member.room_session_id
  }

  get roomId() {
    return this._payload.member.room_id
  }

  get parentId() {
    return this._payload.member.parent_id
  }

  get name() {
    return this._payload.member.name
  }

  get type() {
    return this._payload.member.type
  }

  get meta() {
    return this._payload.member.meta
  }

  get requestedPosition() {
    return this._payload.member.requested_position
  }

  get currentPosition() {
    return this._payload.member.current_position
  }

  get visible() {
    return this._payload.member.visible
  }

  get audioMuted() {
    return this._payload.member.audio_muted
  }

  get videoMuted() {
    return this._payload.member.video_muted
  }

  get deaf() {
    return this._payload.member.deaf
  }

  get inputVolume() {
    return this._payload.member.input_volume
  }

  get outputVolume() {
    return this._payload.member.output_volume
  }

  get inputSensitivity() {
    return this._payload.member.input_sensitivity
  }

  get talking() {
    return this._payload.member.talking
  }

  get handraised() {
    return this._payload.member.handraised
  }

  /** @internal */
  setPayload(payload: RoomSessionMemberEventParams) {
    // Reshape the payload since the `video.member.talking` event does not return all the parameters of a member
    const newPayload = {
      ...payload,
      member: {
        ...this._payload.member,
        ...payload.member,
      },
    }
    this._payload = newPayload
  }

  async remove() {
    await this._client.execute({
      method: 'video.member.remove',
      params: {
        room_session_id: this.roomSessionId,
        member_id: this.memberId,
      },
    })
  }
}

export const RoomSessionMemberAPI = extendComponent<
  RoomSessionMember,
  // `remove` is defined by `RoomSessionMember`
  Omit<VideoMemberMethods, 'remove'>
>(RoomSessionMember, {
  audioMute: RoomMethods.audioMuteMember,
  audioUnmute: RoomMethods.audioUnmuteMember,
  videoMute: RoomMethods.videoMuteMember,
  videoUnmute: RoomMethods.videoUnmuteMember,
  setDeaf: RoomMethods.setDeaf,
  setMicrophoneVolume: RoomMethods.setInputVolumeMember,
  setInputVolume: RoomMethods.setInputVolumeMember,
  setSpeakerVolume: RoomMethods.setOutputVolumeMember,
  setOutputVolume: RoomMethods.setOutputVolumeMember,
  setInputSensitivity: RoomMethods.setInputSensitivityMember,
  setRaisedHand: RoomMethods.setRaisedHand,
})
