import {
  getLogger,
  InternalVideoLayoutLayer,
  InternalVideoLayout,
  debounce,
} from '@signalwire/core'
import {
  LayerMap,
  LocalVideoOverlay,
  UserOverlay,
} from '../fabric/VideoOverlays'

const SDK_PREFIX = 'sw-sdk-'
const addSDKPrefix = (id: string) => {
  return `${SDK_PREFIX}${id}`
}

const OVERLAY_PREFIX = 'sw-overlay-'
const addOverlayPrefix = (id: string) => {
  return `${OVERLAY_PREFIX}${id}`
}

const buildVideo = () => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  /**
   * Local and Remov video elements should never be paused
   * and Safari/Firefox pause the video (ie: enabling PiP, switch cameras etc)
   * We try to force it to keep playing.
   */
  video.addEventListener('pause', () => {
    video.play().catch((error) => {
      getLogger().error('Video Element Paused', video, error)
    })
  })

  return video
}

const waitForVideoReady = ({ element }: { element: HTMLVideoElement }) => {
  return new Promise<void>((resolve) => {
    element.addEventListener('canplay', function listener() {
      element.removeEventListener('canplay', listener)
      resolve()
    })
    element.addEventListener('resize', function listener() {
      element.removeEventListener('resize', listener)
      resolve()
    })
  })
}

const _getLocationStyles = ({
  x,
  y,
  width,
  height,
}: InternalVideoLayoutLayer) => {
  return {
    top: `${y}%`,
    left: `${x}%`,
    width: `${width}%`,
    height: `${height}%`,
  }
}

const _buildLayer = ({ location }: { location: InternalVideoLayoutLayer }) => {
  const { top, left, width, height } = _getLocationStyles(location)
  const layer = document.createElement('div')
  layer.style.position = 'absolute'
  layer.style.overflow = 'hidden'
  layer.style.top = top
  layer.style.left = left
  layer.style.width = width
  layer.style.height = height

  return layer
}

const _updateLayer = ({
  location,
  element,
}: {
  location: InternalVideoLayoutLayer
  element: HTMLElement
}) => {
  const { top, left, width, height } = _getLocationStyles(location)
  element.style.top = top
  element.style.left = left
  element.style.width = width
  element.style.height = height

  return element
}

interface MakeLayoutChangedHandlerParams {
  localVideoOverlay: LocalVideoOverlay
  rootElement: HTMLElement
  applyMemberOverlay?: boolean
  layerMap: LayerMap
}

interface LayoutChangedHandlerParams {
  layout: InternalVideoLayout
  memberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler = (params: MakeLayoutChangedHandlerParams) => {
  const { localVideoOverlay, rootElement, applyMemberOverlay, layerMap } =
    params

  return async (params: LayoutChangedHandlerParams) => {
    const { layout, memberId, localStream } = params

    getLogger().debug('Process layout.changed')
    try {
      const { layers = [] } = layout
      const mcuLayers = rootElement.querySelector('.mcuLayers')

      // Make overlay for all members (including a self member)
      const currMemberLayerIds = new Set([localVideoOverlay.userId])
      if (applyMemberOverlay && mcuLayers) {
        layers.forEach((location) => {
          const memberIdInLocation = location.member_id
          if (!memberIdInLocation) return

          currMemberLayerIds.add(memberIdInLocation)

          const memberLayer = layerMap.get(addOverlayPrefix(memberIdInLocation))
          // If the layer already exists, modify its styles
          if (memberLayer && memberLayer.domElement) {
            _updateLayer({ location, element: memberLayer.domElement })
          } else {
            // If the layer doesn't exist, create a new overlay
            const overlay = new UserOverlay({
              id: addOverlayPrefix(memberIdInLocation),
              layerMap,
            })
            const newMemberLayer = _buildLayer({ location })
            newMemberLayer.id = overlay.id
            newMemberLayer.style.zIndex = '10'
            overlay.domElement = newMemberLayer
            mcuLayers.appendChild(newMemberLayer)
          }
        })

        // Remove layers that no longer have a corresponding member
        layerMap.forEach((layer) => {
          const memberId = layer.userId
          if (!currMemberLayerIds.has(memberId)) {
            if (layer?.domElement) {
              mcuLayers.removeChild(layer.domElement)
              layer.domElement = undefined // This removes it from the layerMap
            }
          }
        })
      }

      // Make local video overlay for the self member
      const location = layers.find(({ member_id }) => member_id === memberId)
      let myLayerEl = localVideoOverlay.domElement
      // Update localOverlay.status if a location has been found
      localVideoOverlay.status = location ? 'visible' : 'hidden'
      if (!location) {
        getLogger().debug('Location not found')
        if (myLayerEl) {
          getLogger().debug('Current layer not visible')
          localVideoOverlay.hide()
        }
        return
      }

      if (!myLayerEl) {
        getLogger().debug('Build myLayer')
        myLayerEl = _buildLayer({ location })
        myLayerEl.id = localVideoOverlay.id
        myLayerEl.style.zIndex = '1'

        const localVideo = buildVideo()
        localVideo.srcObject = localStream
        localVideo.disablePictureInPicture = true
        localVideo.style.width = '100%'
        localVideo.style.height = '100%'
        localVideo.style.pointerEvents = 'none'
        localVideo.style.objectFit = 'cover'

        myLayerEl.appendChild(localVideo)

        if (mcuLayers) {
          getLogger().debug('Build myLayer append it')
          mcuLayers.appendChild(myLayerEl)
          localVideoOverlay.domElement = myLayerEl
          localVideoOverlay.setMirror()
          return
        }

        getLogger().debug('Build myLayer >> wait next')
        return
      }

      /**
       * Show local overlay element only if the localStream has a valid video track
       */
      const hasVideo =
        localStream
          .getVideoTracks()
          .filter((t) => t.enabled && t.readyState === 'live').length > 0
      if (hasVideo) {
        localVideoOverlay.setMediaStream(localStream)
        localVideoOverlay.show()
      } else {
        localVideoOverlay.hide()
      }
      _updateLayer({ location, element: myLayerEl })
    } catch (error) {
      getLogger().error('Layout Changed Error', error)
    }
  }
}

const cleanupElement = (rootElement: HTMLElement) => {
  while (rootElement.firstChild) {
    rootElement.removeChild(rootElement.firstChild)
  }
}

const setVideoMediaTrack = ({
  track,
  element,
}: {
  track: MediaStreamTrack
  element: HTMLVideoElement
}) => {
  element.srcObject = new MediaStream([track])

  track.addEventListener('ended', () => {
    element.srcObject = null
    element.remove()
  })
}

/**
 * @deprecated
 * FIXME remove this in the future
 */
const createRootElementResizeObserver = ({
  video,
  rootElement,
  paddingWrapper,
}: {
  video: HTMLVideoElement
  rootElement: HTMLElement
  paddingWrapper: HTMLDivElement
}) => {
  const computePaddingWrapperWidth = (width: number, height: number) => {
    const nativeVideoRatio = video.videoWidth / video.videoHeight
    const rootElementRatio = width / height
    if (nativeVideoRatio > rootElementRatio) {
      return '100%'
    } else {
      return `${height * nativeVideoRatio}px`
    }
  }

  const maxPaddingBottom = (video.videoHeight / video.videoWidth) * 100
  // debounce to avoid multiple calls
  const update = debounce(
    ({ width, height }: { width: number; height: number }) => {
      if (paddingWrapper) {
        const pb = (height / width) * 100
        paddingWrapper.style.paddingBottom = `${
          pb > maxPaddingBottom ? maxPaddingBottom : pb
        }%`
        paddingWrapper.style.width = computePaddingWrapperWidth(width, height)
      }
    },
    100
  )

  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.contentBoxSize) {
        // Firefox implements `contentBoxSize` as a single content rect, rather than an array
        const { inlineSize, blockSize } = Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]
          : entry.contentBoxSize
        update({ width: inlineSize, height: blockSize })
      } else if (entry.contentRect) {
        update({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
  })

  return {
    start: () => observer.observe(rootElement),
    stop: () => observer.disconnect(),
  }
}

export {
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
  addSDKPrefix,
  addOverlayPrefix,
  createRootElementResizeObserver,
  LocalVideoOverlay,
  SDK_PREFIX,
  OVERLAY_PREFIX,
}
