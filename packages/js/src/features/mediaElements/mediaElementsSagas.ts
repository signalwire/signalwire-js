import { logger, destroyAction } from '@signalwire/core'
import { take, call, fork } from 'redux-saga/effects'
import { SagaIterator, Task } from '@redux-saga/types'
import { setMediaElementSinkId } from '@signalwire/webrtc'
import {
  buildVideo,
  makeDestroyHandler,
  makeDisplayChangeFn,
  makeLayoutChangedHandler,
} from '../../utils/videoElement'
import { audioSetSpeakerAction } from '../actions'

export const makeMediaElementsSaga = ({
  rootElementId,
  applyLocalVideoOverlay,
}: {
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
}) =>
  function* mediaElementsSaga({ instance: room, runSaga }: any): SagaIterator {
    try {
      const layerMap = new Map()
      const userRootElement = rootElementId
        ? document.getElementById(rootElementId)
        : undefined
      const rootElement = userRootElement || document.body
      const videoEl = buildVideo()
      const audioEl = new Audio()

      const destroyHandler = makeDestroyHandler({ layerMap, rootElement })
      const layoutChangedHandler = makeLayoutChangedHandler({
        rootElement,
        element: videoEl,
        layerMap,
      })
      const hideOverlay = makeDisplayChangeFn('none')
      const showOverlay = makeDisplayChangeFn('block')

      if (!userRootElement) {
        logger.warn(
          `We couldn't find an element with id: ${rootElementId}: using 'document.body' instead.`
        )
      }

      room.on('layout.changed', (params: any) => {
        if (room.peer.hasVideoSender && room.localStream) {
          layoutChangedHandler({
            layout: params.layout,
            localStream: room.localStream,
            myMemberId: room.memberId,
          })
        }
      })

      room.on('member.updated.video_muted', (params: any) => {
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

      room.once('destroy', destroyHandler)

      yield take(destroyAction.type)
      audioTask?.cancel()
      videoTask?.cancel()
    } catch (error) {
      logger.error('mediaElementsSagas', error)
    }
  }

function* audioElementActionsWatcher({
  element,
}: {
  element: HTMLAudioElement
}): SagaIterator {
  while (true) {
    try {
      const action = yield take([audioSetSpeakerAction.type])

      switch (action.type) {
        case audioSetSpeakerAction.type:
          yield call(setMediaElementSinkId, element, action.payload)
          break
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

function* audioElementSetupWorker({
  track,
  element,
}: {
  track: MediaStreamTrack
  element: HTMLAudioElement
}): SagaIterator {
  const setAudioMediaTrack = (audioTrack: MediaStreamTrack) => {
    element.autoplay = true
    // @ts-ignore
    element.playsinline = true
    element.srcObject = new MediaStream([audioTrack])

    audioTrack.addEventListener('ended', () => {
      element.srcObject = null
      element.remove()
    })

    return element
  }

  setAudioMediaTrack(track)

  yield fork(audioElementActionsWatcher, {
    element,
  })
}

function* videoElementSetupWorker({
  rootElement,
  applyLocalVideoOverlay = true,
  track,
  element,
}: any): SagaIterator {
  console.log('pppp VIDEO root', rootElement)

  const setVideoMediaTrack = (videoTrack: MediaStreamTrack) => {
    element.srcObject = new MediaStream([videoTrack])

    element.addEventListener('ended', () => {
      element.srcObject = null
      element.remove()
    })
  }

  const handleVideoTrack = (track: MediaStreamTrack) => {
    setVideoMediaTrack(track)

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
