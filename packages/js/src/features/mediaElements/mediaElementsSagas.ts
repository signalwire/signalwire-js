import {
  getLogger,
  CustomSagaParams,
  actions,
  sagaEffects,
} from '@signalwire/core'
import type { SagaIterator, Task } from '@signalwire/core'
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
import type { RoomSessionConnection } from '../../BaseRoomSession'

export const makeVideoElementSaga = ({
  rootElement,
  applyLocalVideoOverlay,
}: {
  rootElement: HTMLElement
  applyLocalVideoOverlay?: boolean
}) => {
  return function* videoElementSaga({
    instance: room,
    runSaga,
  }: CustomSagaParams<RoomSessionConnection>): SagaIterator {
    try {
      const layerMap = new Map()
      const videoEl = buildVideo()
      const layoutChangedHandler = makeLayoutChangedHandler({
        rootElement,
        element: videoEl,
        layerMap,
      })
      const hideOverlay = makeDisplayChangeFn('none')
      const showOverlay = makeDisplayChangeFn('block')

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
          getLogger().error('Error handling video_muted', error)
        }
      })

      let videoTask: Task | undefined

      const trackHandler = function (event: RTCTrackEvent) {
        switch (event.track.kind) {
          case 'video': {
            videoTask = runSaga(videoElementSetupWorker, {
              applyLocalVideoOverlay,
              rootElement,
              track: event.track,
              element: videoEl,
            })
            // Remove listener when done with video
            room.off('track', trackHandler)
            break
          }
        }
      }
      room.on('track', trackHandler)

      room.once('destroy', () => {
        cleanupElement(rootElement)
        layerMap.clear()
        videoTask?.cancel()
      })
    } catch (error) {
      getLogger().error('videoElementSaga', error)
    }
  }
}

export const makeAudioElementSaga = ({ speakerId }: { speakerId?: string }) => {
  return function* audioElementSaga({
    instance: room,
    runSaga,
  }: CustomSagaParams<RoomSessionConnection>): SagaIterator {
    try {
      const audioEl = new Audio()
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
            // Remove listener when done with audio
            room.off('track', trackHandler)
            break
          }
        }
      }
      room.on('track', trackHandler)

      room.once('destroy', () => {
        audioTask?.cancel()
      })
    } catch (error) {
      getLogger().error('audioElementSaga', error)
    }
  }
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
    relativeWrapper.style.margin = '0 auto'
    relativeWrapper.appendChild(paddingWrapper)

    rootElement.style.display = 'flex'
    rootElement.style.alignItems = 'center'
    rootElement.style.justifyContent = 'center'
    rootElement.appendChild(relativeWrapper)
  }

  handleVideoTrack(track)

  // TODO: take destroy
}
