import { SagaIterator } from '@redux-saga/types'
// import { call, put, take, fork } from 'redux-saga/effects'
// import { createAction } from '@reduxjs/toolkit'
import { buildVideo, makeLayoutChangedHandler } from './utils/videoLayout'

// const initMediaElementsAction = createAction('swSdk/initMediaElements')

// TODO: rename
export function* mediaElementsWatcher({
  instance: room,
  runSaga,
}: any): SagaIterator {
  try {
    // const action: any = yield take(initMediaElementsAction.type)
    // TODO: empty this map once the room is destroyed
    const layerMap = new Map()
    // TODO: this should come from options.
    const rootElementId = 'rootElement'
    const rootElement = document.getElementById(rootElementId) || document.body
    const videoEl = buildVideo()
    const audioEl = new Audio()

    const destroyHandler = () => {
      while (rootElement.firstChild) {
        rootElement.removeChild(rootElement.firstChild)
      }
    }

    const layoutChangedHandler = makeLayoutChangedHandler({
      rootElement,
      element: videoEl,
      layerMap,
    })

    room.on('layout.changed', (params: any) => {
      if (room.peer.hasVideoSender && room.localStream) {
        layoutChangedHandler({
          layout: params.layout,
          localStream: room.localStream,
          myMemberId: room.memberId,
        })
      }
    })

    // room.on('member.updated.video_muted', (params: any) => {
    //   // try {
    //   //   const { member } = params
    //   //   if (member.id === room.memberId && 'video_muted' in member) {
    //   //     member.video_muted
    //   //       ? hideOverlay(member.id)
    //   //       : showOverlay(member.id)
    //   //   }
    //   // } catch (error) {
    //   //   logger.error('Error handling video_muted', error)
    //   // }
    // })

    let audioTask: any
    let videoTask: any

    room.on('track', function (event: RTCTrackEvent) {
      switch (event.track.kind) {
        case 'audio':
          audioTask = runSaga(audioElementWorker, {
            track: event.track,
            element: audioEl,
          })
          console.log('pppp audioTask', audioTask)

          break
        case 'video': {
          videoTask = runSaga(videoElementWorker, {
            // TODO: pass missing options
            // ...action.payload,
            rootElement,
            track: event.track,
            element: videoEl,
          })
          console.log('pppp videoTask', videoTask)
          break
        }
      }
    })

    room.once('destroy', destroyHandler)

    // TODO: take destroy and cleanup
    // audioTask?.cancel()
    // videoTask?.cancel()
  } catch (error) {}
}

function* audioElementWorker({
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

  // TODO: take change sinkId
}

function* videoElementWorker({
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
