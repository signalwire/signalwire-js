import {
  FabricLayoutChangedEventParams,
  VideoLayoutChangedEventParams,
  getLogger,
  uuid,
} from '@signalwire/core'
import {
  buildVideo,
  cleanupElement,
  createRootElementResizeObserver,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
} from './utils/videoElement'
import { addSDKPrefix } from './utils/roomSession'
import { OverlayMap, LocalVideoOverlay } from './VideoOverlays'
import {
  FabricRoomSession,
  isFabricRoomSession,
} from './fabric/FabricRoomSession'
import { VideoRoomSession, isVideoRoomSession } from './video/VideoRoomSession'

export interface BuildVideoElementParams {
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
  mirrorLocalVideoOverlay?: boolean
  room: FabricRoomSession | VideoRoomSession
  rootElement?: HTMLElement
}

export interface BuildVideoElementReturnType {
  element: HTMLElement
  overlayMap: OverlayMap
  localVideoOverlay: LocalVideoOverlay
  unsubscribe(): void
}

export const buildVideoElement = async (
  params: BuildVideoElementParams
): Promise<BuildVideoElementReturnType> => {
  try {
    const {
      room,
      rootElement: element,
      applyLocalVideoOverlay = true,
      applyMemberOverlay = true,
      mirrorLocalVideoOverlay = true,
    } = params

    let hasVideoTrack = false
    const overlayMap: OverlayMap = new Map()
    const id = uuid()

    let rootElement: HTMLElement
    if (element) {
      rootElement = element
    } else {
      rootElement = document.createElement('div')
      rootElement.id = `rootElement-${id}`
    }

    /**
     * We used this `LocalVideoOverlay` class to interact with the localVideo
     * overlay DOM element in here and in the `makeLayoutChangedHandler`.
     */
    const overlayId = addSDKPrefix(id)
    const localVideoOverlay = new LocalVideoOverlay({
      id: overlayId,
      mirrorLocalVideoOverlay,
      room,
    })
    if (applyLocalVideoOverlay) {
      overlayMap.set(overlayId, localVideoOverlay)
    }

    const makeLayout = makeLayoutChangedHandler({
      applyLocalVideoOverlay,
      applyMemberOverlay,
      overlayMap,
      localVideoOverlay,
      mirrorLocalVideoOverlay,
      rootElement,
    })

    const processLayoutChanged = (params: any) => {
      // @ts-expect-error
      if (room.peer?.hasVideoSender && room.localStream) {
        makeLayout({
          layout: params.layout,
          localStream: room.localStream,
          memberId: room.memberId,
        })
      } else {
        localVideoOverlay.hide()
      }
    }

    const layoutChangedHandler = (
      params: FabricLayoutChangedEventParams | VideoLayoutChangedEventParams
    ) => {
      getLogger().debug('Received layout.changed - videoTrack', hasVideoTrack)
      if (hasVideoTrack) {
        processLayoutChanged(params)
        return
      }
    }

    if (isFabricRoomSession(room)) {
      room.on('layout.changed', layoutChangedHandler)
    } else if (isVideoRoomSession(room)) {
      room.on('layout.changed', layoutChangedHandler)
    }

    const processVideoTrack = async (track: MediaStreamTrack) => {
      hasVideoTrack = true

      await videoElementSetup({
        applyLocalVideoOverlay,
        applyMemberOverlay,
        rootElement,
        track,
      })

      const roomCurrentLayoutEvent = room.currentLayoutEvent
      // If the `layout.changed` has already been received, process the layout
      if (roomCurrentLayoutEvent) {
        processLayoutChanged(roomCurrentLayoutEvent)
      }
    }

    // If the remote video already exist, inject the remote stream to the video element
    // @ts-expect-error
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
    if (isFabricRoomSession(room)) {
      room.on('track', trackHandler)
    } else if (isVideoRoomSession(room)) {
      room.on('track', trackHandler)
    }

    const unsubscribe = () => {
      cleanupElement(rootElement)
      overlayMap.clear() // Use "delete" rather than "clear" if we want to update the reference
      room.overlayMap = overlayMap
      if (isFabricRoomSession(room)) {
        room.off('track', trackHandler)
        room.off('layout.changed', layoutChangedHandler)
        room.off('destroy', unsubscribe)
      } else if (isVideoRoomSession(room)) {
        room.off('track', trackHandler)
        room.off('layout.changed', layoutChangedHandler)
        room.off('destroy', unsubscribe)
      }
      localVideoOverlay.detachListeners()
    }

    if (isFabricRoomSession(room)) {
      room.once('destroy', unsubscribe)
    } else if (isVideoRoomSession(room)) {
      room.once('destroy', unsubscribe)
    }

    /**
     * The room object is only being used to listen for events.
     * The "buildVideoElement" function does not directly manipulate the room object in order to maintain immutability.
     * Currently, we are overriding the following room properties in case the user calls "buildVideoElement" more than once.
     * However, this can be moved out of here easily if we prefer not to override.
     */
    room.overlayMap = overlayMap
    room.localVideoOverlay = localVideoOverlay

    return { element: rootElement, overlayMap, localVideoOverlay, unsubscribe }
  } catch (error) {
    getLogger().error('Unable to build the video element')
    throw error
  }
}

interface VideoElementSetupWorkerParams {
  rootElement: HTMLElement
  track: MediaStreamTrack
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
}

const videoElementSetup = async (options: VideoElementSetupWorkerParams) => {
  try {
    const { applyLocalVideoOverlay, applyMemberOverlay, track, rootElement } =
      options

    // Create a video element
    const videoElement = buildVideo()

    setVideoMediaTrack({ element: videoElement, track })

    videoElement.style.width = '100%'
    videoElement.style.maxHeight = '100%'

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
    paddingWrapper.style.paddingBottom = '56.25%' // (9 / 16) * 100
    paddingWrapper.style.position = 'relative'
    paddingWrapper.style.width = '100%'
    paddingWrapper.appendChild(mcuWrapper)

    let layersWrapper: HTMLDivElement | null = null

    // If the both flags are false, no need to create the MCU
    if (applyLocalVideoOverlay || applyMemberOverlay) {
      layersWrapper = document.createElement('div')
      layersWrapper.classList.add('mcuLayers')
      layersWrapper.style.display = 'none'
      paddingWrapper.appendChild(layersWrapper)
    }

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

    /**
     * Listen for the rootElement and the videoElement size changes and update the paddingWrapper.
     * The ResizeObserver and the video "resize" event make sure:
     * - The video should always maintain the aspect ratio.
     * - The video should not overflow the user passed rootElement.
     * - The video should not be cropped.
     */
    const rootElementResizeObserver = createRootElementResizeObserver({
      rootElement,
      video: videoElement,
      paddingWrapper,
    })
    rootElementResizeObserver.start()

    track.addEventListener('ended', () => {
      if (rootElementResizeObserver) {
        rootElementResizeObserver.stop()
      }
    })

    if (layersWrapper) {
      layersWrapper.style.display = 'block'
    }
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}
