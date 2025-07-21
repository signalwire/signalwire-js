import {
  CallJoinedEvent,
  CallJoinedEventParams,
  InternalVideoMemberEntity,
  InternalVideoMemberEntityUpdated,
  MapToPubSubShape,
  VideoLayoutChangedEvent,
  VideoMemberJoinedEvent,
  VideoMemberJoinedEventParams,
  VideoMemberLeftEvent,
  VideoMemberLeftEventParams,
  VideoMemberTalkingEvent,
  VideoMemberTalkingEventParams,
  VideoMemberUpdatedEvent,
  VideoMemberUpdatedEventParams,
  InternalMemberEntity,
  InternalMemberEntityUpdated,
  ProgrammableCallsLayoutChangedEvent,
  MemberJoinedEvent,
  MemberJoinedEventParams,
  MemberLeftEvent,
  MemberLeftEventParams,
  MemberTalkingEvent,
  MemberTalkingEventParams,
  MemberUpdatedEvent,
  MemberUpdatedEventParams,
} from '@signalwire/core'
import {} from '../../utils/interfaces/fabric'

/**
 * Map the InternalMemberEntity to InternalVideoMemberEntity
 */
export const mapInternalMemberToInternalVideoMemberEntity = (
  params: InternalMemberEntity
): InternalVideoMemberEntity => {
  return {
    ...params,
    id: params.member_id,
  }
}

/**
 * Map the InternalMemberEntityUpdated to InternalVideoMemberEntityUpdated
 */
export const mapInternalMemberToInternalVideoMemberUpdatedEntity = (
  params: InternalMemberEntityUpdated
): InternalVideoMemberEntityUpdated => {
  return {
    ...mapInternalMemberToInternalVideoMemberEntity(params),
    updated: params.updated.map((key) =>
      key === 'member_id' ? 'id' : (key as keyof InternalVideoMemberEntity)
    ),
  }
}

/**
 * Map the "call.joined" event params to "video.room.subscribed" event params
 */
export const mapCallJoinedToRoomSubscribedEventParams = (
  params: CallJoinedEventParams
) => {
  return {
    ...params,
    room: {
      ...params.room_session,
      members: params.room_session.members.map(
        mapInternalMemberToInternalVideoMemberEntity
      ),
    },
    room_session: {
      ...params.room_session,
      members: params.room_session.members.map(
        mapInternalMemberToInternalVideoMemberEntity
      ),
    },
  }
}

/**
 * Map the "call.joined" action to "video.room.subscribed" action
 */
export const mapCallJoinedToRoomSubscribedAction = (
  action: MapToPubSubShape<CallJoinedEvent>
) => {
  return {
    type: `video.room.subscribed`,
    payload: mapCallJoinedToRoomSubscribedEventParams(action.payload),
  }
}

/**
 * Map the "member.joined" and "member.left" event params
 * to "video.member.joined" and "video.member.left"  event params
 */
export const mapMemberToVideoMemberJoinAndLeftEventParams = (
  params: MemberJoinedEventParams | MemberLeftEventParams
): VideoMemberJoinedEventParams | VideoMemberLeftEventParams => {
  return {
    room_session_id: params.room_session_id,
    room_id: params.room_id,
    member: mapInternalMemberToInternalVideoMemberEntity(params.member),
  }
}

/**
 * Map the "member.joined" and "member.left" actions
 * to "video.member.joined" and "video.member.left"  actions
 */
export const mapMemberActionToVideoMemberJoinAndLeftAction = (
  action: MapToPubSubShape<MemberJoinedEvent | MemberLeftEvent>
): MapToPubSubShape<VideoMemberJoinedEvent | VideoMemberLeftEvent> => {
  return {
    type: `video.${action.type}`,
    payload: mapMemberToVideoMemberJoinAndLeftEventParams(action.payload),
  }
}

/**
 * Map the "member.updated" event params to "video.member.updated"  event params
 */
export const mapMemberEventToVideoMemberUpdatedEventParams = (
  params: MemberUpdatedEventParams
): VideoMemberUpdatedEventParams => {
  return {
    room_session_id: params.room_session_id,
    room_id: params.room_id,
    member: mapInternalMemberToInternalVideoMemberUpdatedEntity(params.member),
  }
}

/**
 * Map the "member.updated" action to "video.member.updated"  action
 */
export const mapMemberActionToVideoMemberUpdatedAction = (
  action: MapToPubSubShape<MemberUpdatedEvent>
): MapToPubSubShape<VideoMemberUpdatedEvent> => {
  return {
    type: `video.${action.type}` as 'video.member.updated',
    payload: mapMemberEventToVideoMemberUpdatedEventParams(action.payload),
  }
}

/**
 * Map the "member.talking" event params to "video.member.talking"  event params
 */
export const mapMemberToVideoMemberTalkingEventParams = (
  params: MemberTalkingEventParams
): VideoMemberTalkingEventParams => {
  return {
    room_session_id: params.room_session_id,
    room_id: params.room_id,
    member: {
      ...params.member,
      id: params.member.member_id,
    },
  }
}

/**
 * Map the "member.talking" action to "video.member.talking"  action
 */
export const mapMemberActionToVideoMemberTalkingAction = (
  action: MapToPubSubShape<MemberTalkingEvent>
): MapToPubSubShape<VideoMemberTalkingEvent> => {
  return {
    type: `video.${action.type}`,
    payload: mapMemberToVideoMemberTalkingEventParams(action.payload),
  }
}

/**
 * Map the "layout.changed" action to "video.layout.changed"  action
 */
export const mapProgrammableCallsLayoutActionToVideoLayoutAction = (
  action: MapToPubSubShape<ProgrammableCallsLayoutChangedEvent>
): MapToPubSubShape<VideoLayoutChangedEvent> => {
  return {
    type: `video.${action.type}`,
    payload: action.payload,
  }
}
