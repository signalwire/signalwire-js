import { SagaIterator } from 'redux-saga'
import { take } from '@redux-saga/core/effects'
import {
  logger,
  isInternalGlobalEvent,
  toInternalEventName,
} from '../../../utils'
import type { EventEmitter } from '../../../utils/EventEmitter'
import type {
  PubSubChannel,
  PubSubAction,
  MapToPubSubShape,
} from '../../interfaces'
import type {
  VideoMemberEvent,
  InternalVideoMemberEvent,
  VideoRoomEvent,
  InternalVideoRoomEvent,
  VideoLayoutEvent,
  VideoRecordingEvent,
} from '../../../types'

type PubSubSagaParams = {
  pubSubChannel: PubSubChannel
  emitter: EventEmitter<string>
}

const isVideoMemberEvent = (
  action: PubSubAction
): action is MapToPubSubShape<VideoMemberEvent | InternalVideoMemberEvent> => {
  return action.type.startsWith('video.member.')
}

const isVideoRoomEvent = (
  action: PubSubAction
): action is MapToPubSubShape<VideoRoomEvent | InternalVideoRoomEvent> => {
  return action.type.startsWith('video.room.')
}

const isVideoLayoutEvent = (
  action: PubSubAction
): action is MapToPubSubShape<VideoLayoutEvent> => {
  return action.type.startsWith('video.layout.')
}

const isVideoRecordingEvent = (
  action: PubSubAction
): action is MapToPubSubShape<VideoRecordingEvent> => {
  return action.type.startsWith('video.recording.')
}

const findNamespaceInPayload = (action: PubSubAction): string => {
  if (action.payload === undefined) {
    return ''
  } else if (
    isVideoMemberEvent(action) ||
    isVideoLayoutEvent(action) ||
    isVideoRecordingEvent(action)
  ) {
    return action.payload.room_session_id
  } else if (isVideoRoomEvent(action)) {
    return action.payload.room_session.id
  }

  return ''
}

export function* pubSubSaga({
  pubSubChannel,
  emitter,
}: PubSubSagaParams): SagaIterator<any> {
  while (true) {
    const pubSubAction: PubSubAction = yield take(pubSubChannel)
    const { type, payload } = pubSubAction
    try {
      const namespace = findNamespaceInPayload(pubSubAction)
      /**
       * There are events (like `video.room.started`/`video.room.ended`) that can
       * be consumed from different places, like from a `roomObj`
       * (namespaced Event Emitter) or from a `client`
       * (non-namespaced/global Event Emitter) so we must trigger the
       * event twice to reach everyone.
       */
      if (isInternalGlobalEvent(type)) {
        emitter.emit(type, payload)
      }

      emitter.emit(
        toInternalEventName<string>({ namespace, event: type }),
        payload
      )
    } catch (error) {
      logger.error(error)
    }
  }
}
