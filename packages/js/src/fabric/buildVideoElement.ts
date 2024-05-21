import { LOCAL_EVENT_PREFIX, getLogger } from '@signalwire/core'
import { CallFabricRoomSessionConnection } from './CallFabricRoomSession'
import {
  LocalOverlay,
  addSDKPrefix,
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
} from '../utils/videoElement'
import { aspectRatioListener } from '../utils/aspectRatioListener'

interface BuildVideoElementParams {
  room: CallFabricRoomSessionConnection
  rootElement?: HTMLDivElement
  applyLocalVideoOverlay?: boolean
}

export const buildVideoElement = async (params: BuildVideoElementParams) => {
  try {
    const { room, rootElement: element, applyLocalVideoOverlay = true } = params

    let rootElement = document.createElement('div')
    rootElement.id = 'rootElement'
    if (element) {
      rootElement = element
    }

    if (!room.peer) {
      return getLogger().error('No RTC Peer exist on the room!')
    }

    // Create a video element
    const videoEl = buildVideo()
    const layerMap = new Map<string, HTMLDivElement>()

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

    const processLayoutChanged = (params: any) => {
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

    // Handle the RTCPeer `track` event
    const trackHandler = async function (event: RTCTrackEvent) {
      if (event.track.kind === 'video') {
        await videoElementSetupWorker({
          applyLocalVideoOverlay,
          rootElement,
          track: event.track,
          element: videoEl,
        })

        // If the layout.changed has already been received, process the layout
        if (room.lastLayoutEvent) {
          processLayoutChanged(room.lastLayoutEvent)
        }
      }
    }

    // If the local stream already present, set it to the video
    if (room.localStream) {
      localOverlay.setLocalOverlayMediaStream(room.localStream)
    }

    // If the remote video already exist, inject the remote stream to the video element
    const videoTrack = room.peer.remoteVideoTrack
    if (videoTrack) {
      await videoElementSetupWorker({
        applyLocalVideoOverlay,
        rootElement,
        track: videoTrack,
        element: videoEl,
      })

      // If the `layout.changed` has already been received, process the layout
      if (room.lastLayoutEvent) {
        processLayoutChanged(room.lastLayoutEvent)
      }
    }

    /**
     * Using `on` instead of `once` (or `off` within trackHandler) because
     * there are cases (promote/demote) where we need to handle multiple `track`
     * events and update the videoEl with the new track.
     */
    room.on('track', trackHandler)

    room.on('layout.changed', (params: any) => {
      getLogger().debug('Received layout.changed - videoTrack', videoTrack)
      if (videoTrack) {
        processLayoutChanged(params)
        return
      }

      room.lastLayoutEvent = params
    })

    // @ts-expect-error
    room.on(`${LOCAL_EVENT_PREFIX}.mirror.video`, (value: boolean) => {
      localOverlay.setLocalOverlayMirror(value)
    })

    /**
     * If the user joins with `join_video_muted: true` or
     * `join_audio_muted: true` we'll stop the streams
     * right away.
     */
    room.on('room.subscribed', () => {
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

    room.once('destroy', () => {
      cleanupElement(rootElement)
      layerMap.clear()
    })

    return rootElement
  } catch (error) {
    return getLogger().error('Unable to build the video element')
  }
}

interface VideoElementSetupWorkerParams {
  rootElement: HTMLDivElement
  track: MediaStreamTrack
  element: HTMLVideoElement
  applyLocalVideoOverlay?: boolean
}

const videoElementSetupWorker = async (
  options: VideoElementSetupWorkerParams
) => {
  try {
    const { applyLocalVideoOverlay, track, element, rootElement } = options

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

    // For less than 3 participants video call, the video aspect ratio can change
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
      await waitForVideoReady({ element })
    }
    getLogger().debug('MCU is ready..')

    layersWrapper.style.display = 'block'
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}