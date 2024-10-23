import {
  InternalVideoLayout,
  LOCAL_EVENT_PREFIX,
  getLogger,
  uuid,
} from '@signalwire/core'
import { CallFabricRoomSession } from './CallFabricRoomSession'
import {
  addSDKPrefix,
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
} from '../utils/videoElement'
import { DeprecatedVideoMemberHandlerParams } from '../video'
import { LocalVideoOverlay } from './VideoOverlays'

export interface BuildVideoElementParams {
  room: CallFabricRoomSession
  rootElement?: HTMLElement
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
}

export interface BuildVideoElementReturnType {
  element: HTMLElement
  unsubscribe(): void
}

const VIDEO_SIZING_EVENTS = ['loadedmetadata', 'resize']

export const buildVideoElement = async (
  params: BuildVideoElementParams
): Promise<BuildVideoElementReturnType> => {
  try {
    const {
      room,
      rootElement: element,
      applyLocalVideoOverlay = true,
      applyMemberOverlay = true,
    } = params

    const id = uuid()

    let rootElement: HTMLElement
    if (element) {
      rootElement = element
    } else {
      rootElement = document.createElement('div')
      rootElement.id = `rootElement-${id}`
    }

    let hasVideoTrack = false

    /**
     * We used this `LocalVideoOverlay` class to interact with the localVideo
     * overlay DOM element in here and in the ``.
     */
    const localVideoOverlay = new LocalVideoOverlay({
      id: addSDKPrefix(id),
      layerMap: room.layerMap,
      room,
    })

    console.log('?? localVideoOverlay', localVideoOverlay)

    const makeLayoutHandler = makeLayoutChangedHandler({
      rootElement,
      localVideoOverlay,
      applyMemberOverlay: true,
      layerMap: room.layerMap,
    })

    const processLayoutChanged = (params: any) => {
      // @ts-expect-error
      if (room.peer?.hasVideoSender && room.localStream) {
        makeLayoutHandler({
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

    const mirrorVideoHandler = (value: boolean) => {
      localVideoOverlay.setMirror(value)
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
            ? localVideoOverlay.hide()
            : localVideoOverlay.show()
        }
      } catch (error) {
        getLogger().error('Error handling video_muted', error)
      }
    }

    room.on('member.updated.video_muted', memberVideoMutedHandler)

    const destroyHander = () => {
      cleanupElement(rootElement)
      room.layerMap.clear()
    }

    room.once('destroy', destroyHander)

    const unsubscribe = () => {
      room.off('track', trackHandler)
      room.off('layout.changed', layoutChangedHandler)
      room.off('member.updated.video_muted', memberVideoMutedHandler)
      // @ts-expect-error
      room.off(`${LOCAL_EVENT_PREFIX}.mirror.video`, mirrorVideoHandler)
      room.off('destroy', destroyHander)
      destroyHander()
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
    paddingWrapper.style.position = 'relative'
    paddingWrapper.style.width = '100%'
    paddingWrapper.appendChild(mcuWrapper)

    // For less than 3 participants video call, the video aspect ratio can change
    const fixInLandscapeOrientation =
      rootElement.classList.contains('landscape-only')
    VIDEO_SIZING_EVENTS.forEach((event) =>
      videoElement.addEventListener(event, () => {
        const paddingBottom = fixInLandscapeOrientation
          ? '56.25'
          : (videoElement.videoHeight / videoElement.videoWidth) * 100
        paddingWrapper.style.paddingBottom = `${paddingBottom}%`
      })
    )

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
