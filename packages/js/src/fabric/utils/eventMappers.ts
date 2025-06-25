import {
  CallJoinedEvent,
  CallJoinedEventParams,
  FabricLayoutChangedEvent,
  FabricMemberJoinedEvent,
  FabricMemberJoinedEventParams,
  FabricMemberLeftEvent,
  FabricMemberLeftEventParams,
  FabricMemberTalkingEvent,
  FabricMemberTalkingEventParams,
  FabricMemberUpdatedEvent,
  FabricMemberUpdatedEventParams,
  InternalFabricMemberEntity,
  InternalFabricMemberEntityUpdated,
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

/**
 * Map the InternalFabricMemberEntity to InternalVideoMemberEntity
 */
export const mapInternalFabricMemberToInternalVideoMemberEntity = (
  params: InternalFabricMemberEntity
): InternalVideoMemberEntity => {
  return {
    ...params,
    id: params.member_id,
  }
}

/**
 * Map the InternalFabricMemberEntityUpdated to InternalVideoMemberEntityUpdated
 */
export const mapInternalFabricMemberToInternalVideoMemberUpdatedEntity = (
  params: InternalFabricMemberEntityUpdated
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
  params: FabricMemberJoinedEventParams | FabricMemberLeftEventParams
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
  action: MapToPubSubShape<FabricMemberJoinedEvent | FabricMemberLeftEvent>
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
  params: FabricMemberUpdatedEventParams
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
  action: MapToPubSubShape<FabricMemberUpdatedEvent>
): MapToPubSubShape<VideoMemberUpdatedEvent> => {
  return {
    type: `video.${action.type}`,
    payload: mapFabricMemberEventToVideoMemberUpdatedEventParams(
      action.payload
    ),
  }
}

/**
 * Map the "member.talking" event params to "video.member.talking"  event params
 */
export const mapFabricMemberToVideoMemberTalkingEventParams = (
  params: FabricMemberTalkingEventParams
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
  action: MapToPubSubShape<FabricMemberTalkingEvent>
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
  action: MapToPubSubShape<FabricLayoutChangedEvent>
): MapToPubSubShape<VideoLayoutChangedEvent> => {
  return {
    type: `video.${action.type}`,
    payload: action.payload,
  }
}
