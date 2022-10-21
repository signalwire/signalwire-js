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
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
  LocalOverlay,
  addSDKPrefix,
  createRootElementResizeObserver,
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
      const layerMap = new Map<string, HTMLDivElement>()
      const videoEl = buildVideo()

      /**
       * We used this `LocalOverlay` interface to interact with the localVideo
       * overlay DOM element in here and in the `layoutChangedHandler`.
       * The idea is to avoid APIs like `document.getElementById` because it
       * won't work if the SDK is used within a Shadow DOM tree.
       * Instead of querying the `document`, let's use our `layerMap`.
       */
      const localOverlay: LocalOverlay = {
        // Each `layout.changed` event will update `status`
        status: 'hidden',
        get id() {
          // FIXME: Use `id` until the `memberId` is stable between promote/demote
          return addSDKPrefix(room.id)
        },
        get domElement() {
          return layerMap.get(this.id)
        },
        set domElement(element: HTMLDivElement | undefined) {
          if (element) {
            getLogger().debug('Set localOverlay', element)
            layerMap.set(this.id, element)
          } else {
            getLogger().debug('Remove localOverlay')
            layerMap.delete(this.id)
          }
        },
        hide() {
          if (!this.domElement) {
            return getLogger().warn('Missing localOverlay to hide')
          }
          this.domElement.style.opacity = '0'
        },
        show() {
          if (!this.domElement) {
            return getLogger().warn('Missing localOverlay to show')
          }
          if (this.status === 'hidden') {
            return getLogger().info('localOverlay not visible')
          }
          this.domElement.style.opacity = '1'
        },
        setLocalOverlayMediaStream(stream: MediaStream) {
          if (!this.domElement) {
            return getLogger().warn(
              'Missing localOverlay to set the local overlay stream'
            )
          }
          const localVideo = this.domElement.querySelector('video')
          if (localVideo) {
            localVideo.srcObject = stream
          }
        },
      }

      const layoutChangedHandler = makeLayoutChangedHandler({
        rootElement,
        localOverlay,
      })

      room.on('layout.changed', (params) => {
        getLogger().debug('Received layout.changed')
        // FIXME: expose a method on BaseConnection
        if (room.peer?.hasVideoSender && room.localStream) {
          layoutChangedHandler({
            layout: params.layout,
            localStream: room.localStream,
            myMemberId: room.memberId,
          })
        } else {
          localOverlay.hide()
        }
      })

      /**
       * If the user joins with `join_video_muted: true` or
       * `join_audio_muted: true` we'll stop the streams
       * right away.
       */
      room.on('room.subscribed', (params) => {
        const member = params.room_session.members?.find(
          (m) => m.id === room.memberId
        )

        if (member?.audio_muted) {
          try {
            room.stopOutboundAudio()
          } catch (error) {
            getLogger().error('Error handling audio_muted', error)
          }
        }

        if (member?.video_muted) {
          try {
            room.stopOutboundVideo()
          } catch (error) {
            getLogger().error('Error handling video_muted', error)
          }
        }

        if (room.localStream) {
          localOverlay.setLocalOverlayMediaStream(room.localStream)
        }
      })

      room.on('member.updated.video_muted', (params) => {
        try {
          const { member } = params
          if (member.id === room.memberId && 'video_muted' in member) {
            member.video_muted ? localOverlay.hide() : localOverlay.show()
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
            break
          }
        }
      }
      /**
       * Using `on` instead of `once` (or `off` within trackHandler) because
       * there are cases (promote/demote) where we need to handle multiple `track`
       * events and update the videoEl with the new track.
       */
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
    if (typeof Audio === 'undefined') {
      getLogger().warn('`Audio` is not supported on this environment.')
      return
    }

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
  let rootElementResizeObserver:
    | ReturnType<typeof createRootElementResizeObserver>
    | undefined = undefined

  try {
    setVideoMediaTrack({ element, track })

    element.style.width = '100%'
    element.style.maxHeight = '100%'

    if (!applyLocalVideoOverlay) {
      rootElement.appendChild(element)
      return
    }
    if (rootElement.querySelector('.mcuContent')) {
      getLogger().debug('MCU Content already there')
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
    paddingWrapper.classList.add('paddingWrapper')
    paddingWrapper.style.paddingBottom = '56.25%'
    paddingWrapper.style.position = 'relative'
    paddingWrapper.style.width = '100%'
    paddingWrapper.appendChild(mcuWrapper)

    const layersWrapper = document.createElement('div')
    layersWrapper.classList.add('mcuLayers')
    layersWrapper.style.display = 'none'
    paddingWrapper.appendChild(layersWrapper)

    const relativeWrapper = document.createElement('div')
    relativeWrapper.classList.add('mcuContent')
    relativeWrapper.style.position = 'relative'
    relativeWrapper.style.width = '100%'
    relativeWrapper.style.height = '100%'
    relativeWrapper.style.margin = '0 auto'
    relativeWrapper.style.display = 'flex'
    relativeWrapper.style.alignItems = 'center'
    relativeWrapper.style.justifyContent = 'center'
    relativeWrapper.appendChild(paddingWrapper)

    rootElement.style.width = '100%'
    rootElement.style.height = '100%'
    rootElement.appendChild(relativeWrapper)

    if (element.readyState === HTMLMediaElement.HAVE_NOTHING) {
      getLogger().debug('Wait for the MCU to be ready')
      yield sagaEffects.call(waitForVideoReady, { element })
    }

    rootElementResizeObserver = createRootElementResizeObserver({
      rootElement,
      video: element,
      paddingWrapper,
    })
    rootElementResizeObserver.start()
    track.addEventListener('ended', () => {
      if (rootElementResizeObserver) {
        rootElementResizeObserver.stop()
      }
    })

    layersWrapper.style.display = 'block'
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}
