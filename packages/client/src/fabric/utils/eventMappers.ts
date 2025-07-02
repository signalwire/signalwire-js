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
} from '@signalwire/core'
import {
  InternalCallMemberEntity,
  InternalCallMemberEntityUpdated,
  CallLayoutChangedEvent,
  CallMemberJoinedEvent,
  CallMemberJoinedEventParams,
  CallMemberLeftEvent,
  CallMemberLeftEventParams,
  CallMemberTalkingEvent,
  CallMemberTalkingEventParams,
  CallMemberUpdatedEvent,
  CallMemberUpdatedEventParams,
} from '../../utils/interfaces/fabric'

/**
 * Map the InternalCallMemberEntity to InternalVideoMemberEntity
 */
export const mapInternalFabricMemberToInternalVideoMemberEntity = (
  params: InternalCallMemberEntity
): InternalVideoMemberEntity => {
  return {
    ...params,
    id: params.member_id,
  }
}

/**
 * Map the InternalCallMemberEntityUpdated to InternalVideoMemberEntityUpdated
 */
export const mapInternalFabricMemberToInternalVideoMemberUpdatedEntity = (
  params: InternalCallMemberEntityUpdated
): InternalVideoMemberEntityUpdated => {
  return {
    ...mapInternalFabricMemberToInternalVideoMemberEntity(params),
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
        mapInternalFabricMemberToInternalVideoMemberEntity
      ),
    },
    room_session: {
      ...params.room_session,
      members: params.room_session.members.map(
        mapInternalFabricMemberToInternalVideoMemberEntity
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
export const mapFabricMemberToVideoMemberJoinAndLeftEventParams = (
  params: CallMemberJoinedEventParams | CallMemberLeftEventParams
): VideoMemberJoinedEventParams | VideoMemberLeftEventParams => {
  return {
    room_session_id: params.room_session_id,
    room_id: params.room_id,
    member: mapInternalFabricMemberToInternalVideoMemberEntity(params.member),
  }
}

/**
 * Map the "member.joined" and "member.left" actions
 * to "video.member.joined" and "video.member.left"  actions
 */
export const mapFabricMemberActionToVideoMemberJoinAndLeftAction = (
  action: MapToPubSubShape<CallMemberJoinedEvent | CallMemberLeftEvent>
): MapToPubSubShape<VideoMemberJoinedEvent | VideoMemberLeftEvent> => {
  return {
    type: `video.${action.type}`,
    payload: mapFabricMemberToVideoMemberJoinAndLeftEventParams(action.payload),
  }
}

/**
 * Map the "member.updated" event params to "video.member.updated"  event params
 */
export const mapFabricMemberEventToVideoMemberUpdatedEventParams = (
  params: CallMemberUpdatedEventParams
): VideoMemberUpdatedEventParams => {
  return {
    room_session_id: params.room_session_id,
    room_id: params.room_id,
    member: mapInternalFabricMemberToInternalVideoMemberUpdatedEntity(
      params.member
    ),
  }
}

/**
 * Map the "member.updated" action to "video.member.updated"  action
 */
export const mapFabricMemberActionToVideoMemberUpdatedAction = (
  action: MapToPubSubShape<CallMemberUpdatedEvent>
): MapToPubSubShape<VideoMemberUpdatedEvent> => {
  return {
    type: `video.${action.type}` as 'video.member.updated',
    payload: mapFabricMemberEventToVideoMemberUpdatedEventParams(
      action.payload
    ),
  }
}

/**
 * Map the "member.talking" event params to "video.member.talking"  event params
 */
export const mapFabricMemberToVideoMemberTalkingEventParams = (
  params: CallMemberTalkingEventParams
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
export const mapFabricMemberActionToVideoMemberTalkingAction = (
  action: MapToPubSubShape<CallMemberTalkingEvent>
): MapToPubSubShape<VideoMemberTalkingEvent> => {
  return {
    type: `video.${action.type}`,
    payload: mapFabricMemberToVideoMemberTalkingEventParams(action.payload),
  }
}

/**
 * Map the "layout.changed" action to "video.layout.changed"  action
 */
export const mapFabricLayoutActionToVideoLayoutAction = (
  action: MapToPubSubShape<CallLayoutChangedEvent>
): MapToPubSubShape<VideoLayoutChangedEvent> => {
  return {
    type: `video.${action.type}`,
    payload: action.payload,
  }
}
