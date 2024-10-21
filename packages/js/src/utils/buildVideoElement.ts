import {
  InternalVideoLayout,
  LOCAL_EVENT_PREFIX,
  getLogger,
  uuid,
} from '@signalwire/core'
import {
  LocalVideoOverlay,
  addSDKPrefix,
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  makeOverlayHandler,
  setVideoMediaTrack,
  waitForVideoReady,
} from './videoElement'
import { DeprecatedVideoMemberHandlerParams } from '../video'
import { RoomSessionConnection } from '../BaseRoomSession'
import { aspectRatioListener } from './aspectRatioListener'

export interface BuildVideoElementParams {
  room: RoomSessionConnection
  rootElement?: HTMLElement
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
  simpleVideoElement?: boolean
}

export interface BuildVideoElementReturnType {
  element: HTMLElement
  unsubscribe(): void
}

export const buildVideoElement = async (
  params: BuildVideoElementParams
): Promise<BuildVideoElementReturnType> => {
  try {
    const { simpleVideoElement = false } = params
    const {
      room,
      rootElement: element,
      applyLocalVideoOverlay = !simpleVideoElement,
      applyMemberOverlay = !simpleVideoElement,
    } = params

    if (simpleVideoElement && (applyLocalVideoOverlay || applyMemberOverlay)) {
      throw new Error(
        'Invalid Params! - can not apply overlays with simpleVideoElement == true'
      )
    }

    const id = uuid()

    let rootElement: HTMLElement
    if (element) {
      rootElement = element
    } else {
      rootElement = document.createElement('div')
      rootElement.id = `rootElement-${id}`
    }

    const layerMap = new Map<string, HTMLDivElement>()
    let hasVideoTrack = false

    /**
     * We used this `LocalOverlay` interface to interact with the localVideo
     * overlay DOM element in here and in the ``.
     * The idea is to avoid APIs like `document.getElementById` because it
     * won't work if the SDK is used within a Shadow DOM tree.
     * Instead of querying the `document`, let's use our `layerMap`.
     */
    const localVideoOverlay: LocalVideoOverlay | undefined =
      simpleVideoElement || !applyLocalVideoOverlay
        ? undefined
        : {
            ...makeOverlayHandler(layerMap)(id),
            get id() {
              // FIXME: Use `id` until the `memberId` is stable between promote/demote
              return addSDKPrefix(id)
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
                return getLogger().warn(
                  'Missing localOverlay to set the mirror'
                )
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
      localVideoOverlay,
      applyMemberOverlay: applyMemberOverlay,
      layerMap: layerMap,
    })

    const processLayoutChanged = (params: any) => {
      if (!(room.peer?.hasVideoSender && room.localStream)) {
        localVideoOverlay?.hide()
      }
      layoutChangedHandler({
        layout: params.layout,
        localStream: room.localStream,
        myMemberId: room.memberId,
      })
    }

    const layoutChangedEventHandler = (params: {
      layout: InternalVideoLayout
    }) => {
      getLogger().debug('Received layout.changed - videoTrack', hasVideoTrack)
      if (hasVideoTrack) {
        processLayoutChanged(params)
        return
      }
    }

    room.on('layout.changed', layoutChangedEventHandler)

    const processVideoTrack = async (track: MediaStreamTrack) => {
      hasVideoTrack = true

      await videoElementSetup({
        simpleVideoElement,
        rootElement,
        track,
      })

      // @ts-expect-error
      const roomCurrentLayoutEvent = room.lastLayoutEvent
      // If the `layout.changed` has already been received, process the layout
      if (roomCurrentLayoutEvent) {
        processLayoutChanged(roomCurrentLayoutEvent)
      }
    }

    // If the remote video already exist, inject the remote stream to the video element
    const videoTrack = room.peer?.remoteVideoTrack as MediaStreamTrack | null
    if (videoTrack) {
      await processVideoTrack(videoTrack)
    }

    // Handle the RTCPeer `track` event
    const trackHandler = async function (event: RTCTrackEvent) {
      if (event.track.kind === 'video') {
        await processVideoTrack(event.track)
      }
    }

    /**
     * Using `on` instead of `once` (or `off` within trackHandler) because
     * there are cases (promote/demote) where we need to handle multiple `track`
     * events and update the videoEl with the new track.
     */
    room.on('track', trackHandler)

    const mirrorVideoHandler = (value: boolean) => {
      localVideoOverlay?.setLocalOverlayMirror(value)
    }

    // @ts-expect-error
    room.on(`${LOCAL_EVENT_PREFIX}.mirror.video`, mirrorVideoHandler)

    const memberVideoMutedHandler = (
      params: DeprecatedVideoMemberHandlerParams
    ) => {
      try {
        const { member } = params
        if (member.id === room.memberId && 'video_muted' in member) {
          member.video_muted
            ? localVideoOverlay?.hide()
            : localVideoOverlay?.show()
        }
      } catch (error) {
        getLogger().error('Error handling video_muted', error)
      }
    }

    room.on('member.updated.video_muted', memberVideoMutedHandler)

    const destroyHandler = () => {
      cleanupElement(rootElement)
      layerMap.clear()
    }

    room.once('destroy', destroyHandler)

    const unsubscribe = () => {
      room.off('track', trackHandler)
      room.off('layout.changed', layoutChangedEventHandler)
      room.off('member.updated.video_muted', memberVideoMutedHandler)
      // @ts-expect-error
      room.off(`${LOCAL_EVENT_PREFIX}.mirror.video`, mirrorVideoHandler)
      room.off('destroy', destroyHandler)
      destroyHandler()
    }

    return { unsubscribe, element: rootElement }
  } catch (error) {
    getLogger().error('Unable to build the video element')
    throw error
  }
}

interface VideoElementSetupWorkerParams {
  rootElement: HTMLElement
  track: MediaStreamTrack
  simpleVideoElement?: boolean
}

const videoElementSetup = async (options: VideoElementSetupWorkerParams) => {
  try {
    const { simpleVideoElement, track, rootElement } = options

    // Create a video element
    const videoElement = buildVideo()

    setVideoMediaTrack({ element: videoElement, track })

    videoElement.style.width = '100%'
    videoElement.style.maxHeight = '100%'

    // If the both flags are false, no need to create the MCU
    if (simpleVideoElement) {
      rootElement.appendChild(videoElement)
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
    mcuWrapper.appendChild(videoElement)

    const paddingWrapper = document.createElement('div')
    paddingWrapper.classList.add('paddingWrapper')
    paddingWrapper.style.position = 'relative'
    paddingWrapper.style.width = '100%'
    paddingWrapper.appendChild(mcuWrapper)

    //for less then 3 participants video call, the video aspect ratio can change
    aspectRatioListener({
      videoElement,
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

    getLogger().debug('MCU readyState 1 >>', videoElement.readyState)
    if (videoElement.readyState === HTMLMediaElement.HAVE_NOTHING) {
      getLogger().debug('Wait for the MCU to be ready')
      await waitForVideoReady({ element: videoElement })
    }
    getLogger().debug('MCU is ready..')

    layersWrapper.style.display = 'block'
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}
