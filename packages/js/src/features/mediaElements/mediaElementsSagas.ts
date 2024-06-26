import {
  getLogger,
  CustomSagaParams,
  actions,
  sagaEffects,
  LOCAL_EVENT_PREFIX,
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
} from '../../utils/videoElement'
import { setAudioMediaTrack } from '../../utils/audioElement'
import { audioSetSpeakerAction } from '../actions'
import type { RoomSessionConnection } from '../../BaseRoomSession'
import { aspectRatioListener } from '../../utils/aspectRatioListener'

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
        setLocalOverlayMirror(mirror: boolean) {
          if (!this.domElement || !this.domElement.firstChild) {
            return getLogger().warn('Missing localOverlay to set the mirror')
          }
          const videoEl = this.domElement.firstChild as HTMLVideoElement
          if (mirror ?? room.localOverlay.mirrored) {
            videoEl.style.transform = 'scale(-1, 1)'
            videoEl.style.webkitTransform = 'scale(-1, 1)'
          } else {
            videoEl.style.transform = 'scale(1, 1)'
            videoEl.style.webkitTransform = 'scale(1, 1)'
          }
        },
      }

      const layoutChangedHandler = makeLayoutChangedHandler({
        rootElement,
        localOverlay,
      })

      let hasVideoTrack = false
      let lastLayoutChanged: any = null

      const _processLayoutChanged = (params: any) => {
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
      }

      // @ts-expect-error
      room.on(`${LOCAL_EVENT_PREFIX}.mirror.video`, (value: boolean) => {
        localOverlay.setLocalOverlayMirror(value)
      })

      room.on('layout.changed', (params) => {
        getLogger().debug('Received layout.changed - videoTrack', hasVideoTrack)
        if (hasVideoTrack) {
          _processLayoutChanged(params)
          return
        }

        lastLayoutChanged = params
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

            hasVideoTrack = true
            if (lastLayoutChanged) {
              _processLayoutChanged(lastLayoutChanged)
            }
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
    paddingWrapper.style.position = 'relative'
    paddingWrapper.style.width = '100%'
    paddingWrapper.appendChild(mcuWrapper)

    //for less then 3 participants video call, the video aspect ratio can change
    aspectRatioListener({
      videoElement: element,
      paddingWrapper,
      fixInLandscapeOrientation:
        rootElement.classList.contains('landscape-only'),
    })

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

    getLogger().debug('MCU readyState 1 >>', element.readyState)
    if (element.readyState === HTMLMediaElement.HAVE_NOTHING) {
      getLogger().debug('Wait for the MCU to be ready')
      yield sagaEffects.call(waitForVideoReady, { element })
    }
    getLogger().debug('MCU is ready..')

    layersWrapper.style.display = 'block'
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}
