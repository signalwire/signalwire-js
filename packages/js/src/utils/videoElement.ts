import {
  getLogger,
  InternalVideoLayoutLayer,
  InternalVideoLayout,
  debounce,
} from '@signalwire/core'

const addSDKPrefix = (id: string) => {
  return `sw-sdk-${id}`
}

const addOverlayPrefix = (id: string) => {
  return `sw-overlay-${id}`
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

export interface MemberOverlay {
  readonly id: string
  status: 'hidden' | 'visible'
  domElement: HTMLDivElement | undefined
  hide(): void
  show(): void
}

export interface LocalOverlay extends MemberOverlay {
  setLocalOverlayMediaStream(stream: MediaStream): void
  setLocalOverlayMirror(mirror?: boolean): void
}

export type LayerMap = Map<string, HTMLDivElement>

type MakeOverlayHandlerReturned = (id: string) => MemberOverlay

export const makeOverlayHandler = (
  layerMap: LayerMap
): MakeOverlayHandlerReturned => {
  return (id: string) => ({
    // Each `layout.changed` event will update `status`
    status: 'hidden',
    get id() {
      return addOverlayPrefix(id)
    },
    get domElement() {
      return layerMap.get(this.id)
    },
    set domElement(element: HTMLDivElement | undefined) {
      if (element) {
        getLogger().debug('Set overlay', element)
        layerMap.set(this.id, element)
      } else {
        getLogger().debug('Remove overlay')
        layerMap.delete(this.id)
      }
    },
    hide() {
      if (!this.domElement) {
        return getLogger().warn('Missing overlay to hide')
      }
      this.domElement.style.opacity = '0'
    },
    show() {
      if (!this.domElement) {
        return getLogger().warn('Missing overlay to show')
      }
      if (this.status === 'hidden') {
        return getLogger().info('Overlay not visible')
      }
      this.domElement.style.opacity = '1'
    },
  })
}

interface MakeLayoutChangedHandlerParams {
  localOverlay: LocalOverlay
  rootElement: HTMLElement
  applyMemberOverlay?: boolean
  layerMap: LayerMap
}

interface LayoutChangedHandlerParams {
  layout: InternalVideoLayout
  myMemberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler = (params: MakeLayoutChangedHandlerParams) => {
  const { localOverlay, rootElement, applyMemberOverlay, layerMap } = params

  const getOverlay = makeOverlayHandler(layerMap)

  return async (params: LayoutChangedHandlerParams) => {
    const { layout, myMemberId, localStream } = params

    getLogger().debug('Process layout.changed')
    try {
      const { layers = [] } = layout
      const location = layers.find(({ member_id }) => member_id === myMemberId)

      let myLayer = localOverlay.domElement
      // Update localOverlay.status if a location has been found
      localOverlay.status = location ? 'visible' : 'hidden'
      if (!location) {
        getLogger().debug('Location not found')
        if (myLayer) {
          getLogger().debug('Current layer not visible')
          localOverlay.hide()
        }

        return
      }

      const mcuLayers = rootElement.querySelector('.mcuLayers')
      if (!myLayer) {
        getLogger().debug('Build myLayer')
        myLayer = _buildLayer({ location })
        myLayer.id = localOverlay.id
        myLayer.style.zIndex = '1'

        const localVideo = buildVideo()
        localVideo.srcObject = localStream
        localVideo.disablePictureInPicture = true
        localVideo.style.width = '100%'
        localVideo.style.height = '100%'
        localVideo.style.pointerEvents = 'none'
        localVideo.style.objectFit = 'cover'

        myLayer.appendChild(localVideo)

        if (mcuLayers) {
          mcuLayers.innerHTML = ''
          getLogger().debug('Build myLayer append it')
          mcuLayers.appendChild(myLayer)
          localOverlay.domElement = myLayer
          localOverlay.setLocalOverlayMirror()
          return
        }

        getLogger().debug('Build myLayer >> wait next')
        return
      }

      /**
       * Show myLayer only if the localStream has a valid video track
       */
      const hasVideo =
        localStream
          .getVideoTracks()
          .filter((t) => t.enabled && t.readyState === 'live').length > 0
      if (hasVideo) {
        localOverlay.setLocalOverlayMediaStream(localStream)
      }
      myLayer.style.opacity = hasVideo ? '1' : '0'
      _updateLayer({ location, element: myLayer })

      // Make overlay for all members (including a self member)
      if (applyMemberOverlay && mcuLayers) {
        layers.forEach((location) => {
          if (!location.member_id) return
          const overlay = getOverlay(location.member_id)

          let memberLayer = overlay.domElement

          // If the layer already exists, modify its styles
          if (memberLayer) {
            _updateLayer({ location, element: memberLayer })
          } else {
            // If the layer doesn't exist, create a new one
            memberLayer = _buildLayer({ location })
            memberLayer.id = overlay.id
            memberLayer.style.zIndex = '10'
            overlay.domElement = memberLayer
            mcuLayers.appendChild(memberLayer)
          }
        })

        // Remove layers that no longer have a corresponding member
        layerMap.forEach((layer, id) => {
          console.log(`ID: ${id}, Layer Element:`, layer)
          const memberId = id.replace('sw-overlay-', '')
          if (!layers.some((location) => location.member_id === memberId)) {
            const overlay = getOverlay(memberId)
            if (overlay.domElement) {
              mcuLayers.removeChild(overlay.domElement)
              overlay.domElement = undefined // This removes it from the layerMap
            }
          }
        })
      }
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
  createRootElementResizeObserver,
}
