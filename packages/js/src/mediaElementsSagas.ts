import { SagaIterator } from '@redux-saga/types'
// import { call, put, take, fork } from 'redux-saga/effects'
// import { createAction } from '@reduxjs/toolkit'
import { buildVideo } from './utils/videoElementFactory'

// const initMediaElementsAction = createAction('swSdk/initMediaElements')

export function* mediaElementsWatcher({
  instance: room,
  runSaga,
}: any): SagaIterator {
  // while (true) {
  try {
    // const action: any = yield take(initMediaElementsAction.type)
    const rootElementId = 'rootElement'
    const rootElement = document.getElementById(rootElementId) || document.body

    const destroyHandler = () => {
      while (rootElement.firstChild) {
        rootElement.removeChild(rootElement.firstChild)
      }
    }

    // room.on('layout.changed', (params: any) => {
    //   if (room.peer.hasVideoSender && room.localStream) {
    //     // layoutChangedHandler({
    //     //   layout: params.layout,
    //     //   localStream: room.localStream,
    //     //   myMemberId: room.memberId,
    //     // })
    //   }
    // })

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

    // room.on('track', () => {
    //   console.log('pppp ENTRO FRESCO TRACK')
    // })

    room.on('track', function (event: RTCTrackEvent) {
      switch (event.track.kind) {
        case 'audio':
          audioTask = runSaga(audioElementWorker, event.track)
          console.log('pppp audioTask', audioTask)

          break
        case 'video': {
          videoTask = runSaga(videoElementWorker, {
            // ...action.payload,
            track: event.track,
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
  // }
}

function* audioElementWorker(audioTrack: MediaStreamTrack): SagaIterator {
  const audio = new Audio()

  const buildAudioElementByTrack = (audioTrack: MediaStreamTrack) => {
    audio.autoplay = true
    // @ts-ignore
    audio.playsinline = true
    audio.srcObject = new MediaStream([audioTrack])

    audioTrack.addEventListener('ended', () => {
      audio.srcObject = null
      audio.remove()
    })

    return audio
  }

  buildAudioElementByTrack(audioTrack)

  // TODO: take change sinkId
}

function* videoElementWorker({
  rootElementId = 'rootElement',
  applyLocalVideoOverlay = true,
  track,
}: any): SagaIterator {
  const rootElement = document.getElementById(rootElementId) || document.body
  const videoEl: HTMLVideoElement = buildVideo()

  console.log('pppp VIDEO root', rootElement)

  const setVideoMediaTrack = (videoTrack: MediaStreamTrack) => {
    videoEl.srcObject = new MediaStream([videoTrack])

    videoEl.addEventListener('ended', () => {
      videoEl.srcObject = null
      videoEl.remove()
    })
  }

  const handleVideoTrack = (track: MediaStreamTrack) => {
    setVideoMediaTrack(track)

    videoEl.style.width = '100%'
    videoEl.style.height = '100%'

    if (!applyLocalVideoOverlay) {
      rootElement.appendChild(videoEl)
      return
    }

    const mcuWrapper = document.createElement('div')
    mcuWrapper.style.position = 'absolute'
    mcuWrapper.style.top = '0'
    mcuWrapper.style.left = '0'
    mcuWrapper.style.right = '0'
    mcuWrapper.style.bottom = '0'
    mcuWrapper.appendChild(videoEl)

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
