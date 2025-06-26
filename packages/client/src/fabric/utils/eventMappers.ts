import {
  CallJoinedEvent,
  CallJoinedEventParams,
  CallUpdatedEvent,
  CallUpdatedEventParams,
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
  InternalFabricRoomSessionEntity,
  InternalVideoMemberEntity,
  InternalVideoMemberEntityUpdated,
  InternalVideoRoomEntity,
  InternalVideoRoomSessionEntity,
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
  VideoRoomSubscribedEvent,
  VideoRoomSubscribedEventParams,
  VideoRoomUpdatedEvent,
  VideoRoomUpdatedEventParams,
} from '@signalwire/core'

/**
 * Map the InternalFabricMemberEntity to InternalVideoMemberEntity
 */
export const mapInternalFabricMemberToInternalVideoMemberEntity = (
  params: InternalFabricMemberEntity
): InternalVideoMemberEntity => {
  return {
    id: params.member_id,
    room_id: params.room_id,
    room_session_id: params.room_session_id,
    name: params.name,
    type: params.type,
    handraised: params.handraised,
    visible: params.visible,
    audio_muted: params.audio_muted,
    video_muted: params.video_muted,
    deaf: params.deaf,
    input_volume: params.input_volume,
    output_volume: params.output_volume,
    input_sensitivity: params.input_sensitivity,
    meta: params.meta,
    talking: params.talking,
    current_position: params.current_position,
    requested_position: params.requested_position,
    parent_id: params.parent_id,
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
 * Map InternalUnifiedCommunicationSessionEntity to InternalVideoRoomEntity
 */
export const mapInternalFabricRoomToInternalVideoRoomEntity = (
  params: InternalFabricRoomSessionEntity
): InternalVideoRoomEntity => {
  return {
    room_id: params.room_id,
    room_session_id: params.room_session_id,
    event_channel: params.event_channel,
    name: params.name,
    recording: params.recording,
    hide_video_muted: params.hide_video_muted,
    preview_url: params.preview_url,
    recordings: params.recordings,
    playbacks: params.playbacks,
    streams: params.streams,
    prioritize_handraise: params.prioritize_handraise,
  }
}

/**
 * Map InternalFabricRoomSessionEntity to InternalVideoRoomSessionEntity
 */
export const mapInternalFabricRoomToInternalVideoRoomSessionEntity = (
  params: InternalFabricRoomSessionEntity
): InternalVideoRoomSessionEntity => {
  return {
    id: params.id,
    display_name: params.display_name,
    room_id: params.room_id,
    room_session_id: params.room_session_id,
    event_channel: params.event_channel,
    name: params.name,
    recording: params.recording,
    recordings: params.recordings,
    playbacks: params.playbacks,
    hide_video_muted: params.hide_video_muted,
    preview_url: params.preview_url,
    layout_name: params.layout_name,
    locked: params.locked,
    meta: params.meta,
    members: params.members.map(
      mapInternalFabricMemberToInternalVideoMemberEntity
    ),
    streaming: params.streaming,
    streams: params.streams,
    prioritize_handraise: params.prioritize_handraise,
    updated: params.updated,
  }
}

/**
 * Map the "call.joined" event params to "video.room.subscribed" event params
 */
export const mapCallJoinedToRoomSubscribedEventParams = (
  params: CallJoinedEventParams
): VideoRoomSubscribedEventParams => {
  return {
    call_id: params.call_id,
    member_id: params.member_id,
    room: {
      ...mapInternalFabricRoomToInternalVideoRoomEntity(params.room_session),
      members: params.room_session.members.map(
        mapInternalFabricMemberToInternalVideoMemberEntity
      ),
    },
    room_session: {
      ...mapInternalFabricRoomToInternalVideoRoomSessionEntity(
        params.room_session
      ),
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
): MapToPubSubShape<VideoRoomSubscribedEvent> => {
  return {
    type: `video.room.subscribed`,
    payload: mapCallJoinedToRoomSubscribedEventParams(action.payload),
  }
}

/**
 * Map the "call.updated" event params to "video.room.updated" event params
 */
export const mapCallUpdatedToRoomUpdatedEventParams = (
  params: CallUpdatedEventParams
): VideoRoomUpdatedEventParams => {
  return {
    room_id: params.room_id,
    room_session_id: params.room_session_id,
    room: mapInternalFabricRoomToInternalVideoRoomEntity(params.room_session),
    room_session: mapInternalFabricRoomToInternalVideoRoomSessionEntity(
      params.room_session
    ),
  }
}

/**
 * Map the "call.updated" action to "video.room.updated" action
 */
export const mapCallUpdatedToRoomUpdatedEventAction = (
  action: MapToPubSubShape<CallUpdatedEvent>
): MapToPubSubShape<VideoRoomUpdatedEvent> => {
  return {
    type: `video.room.updated`,
    payload: mapCallUpdatedToRoomUpdatedEventParams(action.payload),
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
      id: params.member.member_id,
      talking: params.member.talking,
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
