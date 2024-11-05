import { InternalVideoLayout, getLogger, uuid } from '@signalwire/core'
import {
  buildVideo,
  cleanupElement,
  createRootElementResizeObserver,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
} from './utils/videoElement'
import { OverlayMap, LocalVideoOverlay, addSDKPrefix } from './VideoOverlays'
import { CallFabricRoomSession } from './fabric'
import { RoomSession } from './video'
import { BaseRoomSession } from './BaseRoomSession'

export interface BuildVideoElementParams {
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
  mirrorLocalVideoOverlay?: boolean
  room: CallFabricRoomSession | RoomSession | BaseRoomSession<RoomSession>
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

    const layoutChangedHandler = (params: { layout: InternalVideoLayout }) => {
      getLogger().debug('Received layout.changed - videoTrack', hasVideoTrack)
      if (hasVideoTrack) {
        processLayoutChanged(params)
        return
      }
    }

    room.on('layout.changed', layoutChangedHandler)

    const processVideoTrack = async (track: MediaStreamTrack) => {
      hasVideoTrack = true

      await videoElementSetup({
        applyLocalVideoOverlay,
        applyMemberOverlay,
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
    room.on('track', trackHandler)

    const unsubscribe = () => {
      cleanupElement(rootElement)
      overlayMap.clear() // Use "delete" rather than "clear" if we want to update the reference
      room.overlayMap = overlayMap
      room.off('track', trackHandler)
      room.off('layout.changed', layoutChangedHandler)
      room.off('destroy', unsubscribe)
      localVideoOverlay.detachListeners()
    }

    room.once('destroy', unsubscribe)

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

    // If the both flags are false, no need to create the MCU
    if (!applyLocalVideoOverlay && !applyMemberOverlay) {
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

    getLogger().debug('MCU readyState 1 >>', videoElement.readyState)
    if (videoElement.readyState === HTMLMediaElement.HAVE_NOTHING) {
      getLogger().debug('Wait for the MCU to be ready')
      await waitForVideoReady({ element: videoElement })
    }
    getLogger().debug('MCU is ready..')

    // For less than 3 participants, the video aspect ratio can change
    // Such as with "grid-responsive-mobile" layout event
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

    layersWrapper.style.display = 'block'
  } catch (error) {
    getLogger().error('Handle video track error', error)
  }
}
