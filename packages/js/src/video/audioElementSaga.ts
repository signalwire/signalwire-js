import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  actions,
} from '@signalwire/core'
import type { Task } from '@signalwire/core'
import { RoomSessionConnection } from '../BaseRoomSession'
import { setAudioMediaTrack } from '../utils/audioElement'
import { setMediaElementSinkId } from '@signalwire/webrtc'
import { audioSetSpeakerAction } from '../features/actions'

export const audioElementSaga: SDKWorker<RoomSessionConnection> = function* (
  options
): SagaIterator {
  const {
    instance: room,
    runSaga,
    initialState: { speakerId },
  } = options

  if (typeof Audio === 'undefined') {
    getLogger().warn('`Audio` is not supported on this environment.')
    return
  }

  try {
    const audioEl = room.getAudioEl()
    let audioTask: Task | undefined

    const trackHandler = function (event: RTCTrackEvent) {
      switch (event.track.kind) {
        case 'audio': {
          audioTask = runSaga(audioElementSetupWorker, {
            track: event.track,
            element: audioEl,
            speakerId,
            room,
          })
          break
        }
      }
    }
    /**
     * Using `on` instead of `once` (or `off` within trackHandler) because
     * there are cases (promote/demote) where we need to handle multiple `track`
     * events and update the audioEl with the new track.
     */
    room.on('track', trackHandler)

    room.once('destroy', () => {
      audioTask?.cancel()
    })
  } catch (error) {
    getLogger().error('audioElementSaga', error)
  }
}

function* audioElementSetupWorker({
  track,
  element,
  speakerId,
  room,
}: {
  track: MediaStreamTrack
  element: HTMLAudioElement
  speakerId?: string
  room: RoomSessionConnection
}): SagaIterator {
  setAudioMediaTrack({ track, element })
  if (speakerId) {
    // Catch no-op since setMediaElementSinkId already provides logs
    setMediaElementSinkId(element, speakerId).catch(() => {})
  }

  yield sagaEffects.fork(audioElementActionsWatcher, {
    element,
    room,
  })
}

function* audioElementActionsWatcher({
  element,
  room,
}: {
  element: HTMLAudioElement
  room: RoomSessionConnection
}): SagaIterator {
  // TODO: For now we're handling individual actions but in the future
  // we might want to have a single action per custom saga and use it
  // in a similar fashion to `executeAction`
  const setSpeakerActionType = actions.getCustomSagaActionType(
    room.__uuid,
    audioSetSpeakerAction
  )

  while (true) {
    const action = yield sagaEffects.take([setSpeakerActionType])

    try {
      switch (action.type) {
        case setSpeakerActionType:
          const response = yield sagaEffects.call(
            setMediaElementSinkId,
            element,
            action.payload
          )

          room.emit(
            // @ts-expect-error
            `${LOCAL_EVENT_PREFIX}.speaker.updated`,
            action.payload
          )

          room.settleCustomSagaTrigger({
            dispatchId: action.dispatchId,
            payload: response,
            kind: 'resolve',
          })
          break
      }
    } catch (error) {
      room.settleCustomSagaTrigger({
        dispatchId: action.dispatchId,
        payload: error,
        kind: 'reject',
      })
      getLogger().error(error)
    }
  }
}
