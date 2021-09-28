import { logger, CustomSagaParams, actions } from '@signalwire/core'
import { take, call, fork } from '@redux-saga/core/effects'
import { SagaIterator, Task } from '@redux-saga/types'
import { setMediaElementSinkId } from '@signalwire/webrtc'
import {
  buildVideo,
  cleanupElement,
  makeDisplayChangeFn,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
} from '../../utils/videoElement'
import { setAudioMediaTrack } from '../../utils/audioElement'
import { audioSetSpeakerAction } from '../actions'
import type { RoomConnection } from '../../Room'

export const makeMediaElementsSaga = ({
  rootElementId,
  rootElement: rootEl,
  applyLocalVideoOverlay,
  speakerId,
}: {
  rootElementId?: string
  rootElement?: HTMLElement
  applyLocalVideoOverlay?: boolean
  speakerId?: string
}) =>
  function* mediaElementsSaga({
    instance: room,
    runSaga,
  }: CustomSagaParams<RoomConnection>): SagaIterator {
    try {
      const layerMap = new Map()
      const userRootElement = rootElementId
        ? document.getElementById(rootElementId)
        : undefined
      const rootElement = userRootElement || rootEl || document.body
      const videoEl = buildVideo()
      const audioEl = new Audio()
      const layoutChangedHandler = makeLayoutChangedHandler({
        rootElement,
        element: videoEl,
        layerMap,
      })
      const hideOverlay = makeDisplayChangeFn('none')
      const showOverlay = makeDisplayChangeFn('block')

      if (!userRootElement && !rootEl) {
        logger.warn(
          `We couldn't find an element with id: ${rootElementId}: using 'document.body' instead.`
        )
      }

      room.on('layout.changed', (params) => {
        if (room.peer.hasVideoSender && room.localStream) {
          layoutChangedHandler({
            // @ts-expect-error
            layout: params.layout,
            localStream: room.localStream,
            myMemberId: room.memberId,
          })
        }
      })

      room.on('member.updated.video_muted', (params) => {
        try {
          const { member } = params
          if (member.id === room.memberId && 'video_muted' in member) {
            member.video_muted ? hideOverlay(member.id) : showOverlay(member.id)
          }
        } catch (error) {
          logger.error('Error handling video_muted', error)
        }
      })

      let audioTask: Task | undefined
      let videoTask: Task | undefined

      room.on('track', function (event: RTCTrackEvent) {
        switch (event.track.kind) {
          case 'audio':
            audioTask = runSaga(audioElementSetupWorker, {
              track: event.track,
              element: audioEl,
              speakerId,
              room,
            })
            break
          case 'video': {
            videoTask = runSaga(videoElementSetupWorker, {
              applyLocalVideoOverlay,
              rootElement,
              track: event.track,
              element: videoEl,
            })
            break
          }
        }
      })

      room.once('destroy', () => {
        cleanupElement(rootElement)
        layerMap.clear()
        audioTask?.cancel()
        videoTask?.cancel()
      })
    } catch (error) {
      logger.error('mediaElementsSagas', error)
    }
  }

function* audioElementActionsWatcher({
  element,
  room,
}: {
  element: HTMLAudioElement
  room: RoomConnection
}): SagaIterator {
  // TODO: For now we're handling individual actions but in the future
  // we might want to have a single action per custom saga and use it
  // in a similar fashion to `executeAction`
  const setSpeakerActionType = actions.getCustomSagaActionType(
    room.__uuid,
    audioSetSpeakerAction
  )

  while (true) {
    const action = yield take([setSpeakerActionType])

    try {
      switch (action.type) {
        case setSpeakerActionType:
          const response = yield call(
            setMediaElementSinkId,
            element,
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
      logger.error(error)
    }
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
  room: RoomConnection
}): SagaIterator {
  setAudioMediaTrack({ track, element })
  if (speakerId) {
    // Catch no-op since setMediaElementSinkId already provides logs
    setMediaElementSinkId(element, speakerId).catch(() => {})
  }

  yield fork(audioElementActionsWatcher, {
    element,
    room,
  })
}

function* videoElementSetupWorker({
  rootElement,
  applyLocalVideoOverlay = true,
  track,
  element,
}: {
  // TODO: we'll move this to a separate type once we define how to
  // dispatch action that only target unique sagas
  rootElement: HTMLElement
  applyLocalVideoOverlay?: boolean
  track: MediaStreamTrack
  element: HTMLVideoElement
}): SagaIterator {
  const handleVideoTrack = (track: MediaStreamTrack) => {
    setVideoMediaTrack({ element, track })

    element.style.width = '100%'
    element.style.height = '100%'

    if (!applyLocalVideoOverlay) {
      rootElement.appendChild(element)
      return
    }

    const mcuWrapper = document.createElement('div')
    mcuWrapper.style.position = 'absolute'
    mcuWrapper.style.top = '0'
    mcuWrapper.style.left = '0'
    mcuWrapper.style.right = '0'
    mcuWrapper.style.bottom = '0'
    mcuWrapper.appendChild(element)

    const paddingWrapper = document.createElement('div')
    paddingWrapper.style.paddingBottom = '56.25%'
    paddingWrapper.appendChild(mcuWrapper)

    const layersWrapper = document.createElement('div')
    layersWrapper.classList.add('mcuLayers')
    paddingWrapper.appendChild(layersWrapper)

    const relativeWrapper = document.createElement('div')
    relativeWrapper.style.position = 'relative'
    relativeWrapper.style.width = '100%'
    relativeWrapper.style.height = '100%'
    relativeWrapper.style.margin = '0 auto'
    relativeWrapper.appendChild(paddingWrapper)

    rootElement.appendChild(relativeWrapper)
  }

  handleVideoTrack(track)

  // TODO: take destroy
}
