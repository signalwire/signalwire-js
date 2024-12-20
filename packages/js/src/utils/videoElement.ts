import {
  getLogger,
  InternalVideoLayoutLayer,
  InternalVideoLayout,
  debounce,
  uuid,
} from '@signalwire/core'
import {
  OverlayMap,
  LocalVideoOverlay,
  UserOverlay,
  addOverlayPrefix,
} from '../VideoOverlays'

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
  applyLocalVideoOverlay?: boolean
  applyMemberOverlay?: boolean
  overlayMap: OverlayMap
  localVideoOverlay: LocalVideoOverlay
  mirrorLocalVideoOverlay?: boolean
  rootElement: HTMLElement
}

interface LayoutChangedHandlerParams {
  layout: InternalVideoLayout
  memberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler = (params: MakeLayoutChangedHandlerParams) => {
  const {
    applyLocalVideoOverlay,
    applyMemberOverlay,
    overlayMap,
    localVideoOverlay,
    mirrorLocalVideoOverlay,
    rootElement,
  } = params

  return async (params: LayoutChangedHandlerParams) => {
    getLogger().debug('Process layout.changed')
    try {
      const { layout, memberId, localStream } = params
      const { layers = [] } = layout
      const mcuLayers = rootElement.querySelector('.mcuLayers')

      // To handle the DOM updates in batch
      const fragment = document.createDocumentFragment()
      const currentOverlayIds = new Set()

      // Make local video overlay for the self member
      if (applyLocalVideoOverlay) {
        const location = layers.find(({ member_id }) => member_id === memberId)
        const overlayId = localVideoOverlay.id // LocalVideoOverlay ID is already unique
        let myLayerEl = localVideoOverlay.domElement
        currentOverlayIds.add(overlayId)

        if (!location) {
          getLogger().warn('Local video overlay location not found')
          localVideoOverlay.status = 'hidden'
          if (myLayerEl) {
            // Should we remove it from the DOM and the OverlayMap?
            localVideoOverlay.hide()
          }
        } else {
          if (myLayerEl) {
            getLogger().debug('Update local video overlay')
            _updateLayer({ location, element: myLayerEl })
          } else {
            getLogger().debug('Build local video overlay')
            myLayerEl = _buildLayer({ location })
            myLayerEl.id = overlayId

            const localVideo = buildVideo()
            localVideo.srcObject = localStream
            localVideo.disablePictureInPicture = true
            localVideo.style.width = '100%'
            localVideo.style.height = '100%'
            localVideo.style.pointerEvents = 'none'
            localVideo.style.objectFit = 'cover'

            myLayerEl.appendChild(localVideo)
            localVideoOverlay.domElement = myLayerEl

            // Mirror the local video if user has requested it
            if (mirrorLocalVideoOverlay) {
              localVideoOverlay.setMirror()
            }
          }

          // Show local overlay element only if the localStream has a valid video track
          const hasVideo =
            localStream
              .getVideoTracks()
              .filter((t) => t.enabled && t.readyState === 'live').length > 0
          if (hasVideo && location.visible) {
            localVideoOverlay.setMediaStream(localStream)
            localVideoOverlay.show()
          } else {
            localVideoOverlay.hide()
          }

          // Append the local video overlay to the fragment
          fragment.appendChild(myLayerEl)
        }
      }

      // Make overlay for all members (including a self member)
      if (applyMemberOverlay) {
        layers.forEach((location) => {
          const memberIdInLocation = location.member_id
          if (!memberIdInLocation) return

          const overlayId = addOverlayPrefix(memberIdInLocation)
          currentOverlayIds.add(overlayId)

          let overlay = overlayMap.get(overlayId)

          if (overlay && overlay.domElement) {
            // If the overlay already exists, modify its styles
            getLogger().debug('Update an overlay for ', memberIdInLocation)
            _updateLayer({ location, element: overlay.domElement })
          } else {
            // If the overlay doesn't exist, create a new overlay
            getLogger().debug('Build an overlay for ', memberIdInLocation)
            overlay = new UserOverlay({ id: overlayId })
            overlayMap.set(overlayId, overlay)

            const newLayer = _buildLayer({ location })
            newLayer.id = `${overlayId}-${uuid()}` // Unique DOM ID since user is allowed to build multiple video elements

            overlay.domElement = newLayer
          }

          if (!location.visible) {
            overlay.hide()
          } else {
            overlay.show()
          }

          // Append the overlay element to the fragment
          fragment.appendChild(overlay.domElement)
        })
      }

      // Remove overlays that are no longer present
      overlayMap.forEach((overlay, overlayId) => {
        if (!currentOverlayIds.has(overlayId)) {
          if (overlay.domElement && overlay.domElement.parentNode) {
            overlay.domElement.parentNode.removeChild(overlay.domElement)
          }
          overlayMap.delete(overlayId)
        }
      })

      // Replace mcuLayers content in batch with the fragment
      if (mcuLayers) {
        mcuLayers.innerHTML = ''
        mcuLayers.appendChild(fragment)
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

  // Debounce to avoid multiple calls
  const update = debounce(
    ({ width, height }: { width: number; height: number }) => {
      const maxPaddingBottom = (video.videoHeight / video.videoWidth) * 100
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

  /**
   * When the intrinsic dimensions of the video changes, the root element resize may or may not trigger.
   * For example; remote stream from the server changes dimensions from 16/9 (Landscape) to 9/16 (Portrait) mode.
   * For this reason we need to listen for the 'resize' event on the video element.
   */
  const onVideoResize = () => {
    const width = rootElement.clientWidth
    const height = rootElement.clientHeight
    update({ width, height })
  }

  return {
    start: () => {
      observer.observe(rootElement)
      video.addEventListener('resize', onVideoResize)
    },
    stop: () => {
      observer.disconnect()
      video.removeEventListener('resize', onVideoResize)
    },
  }
}

export {
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  setVideoMediaTrack,
  waitForVideoReady,
  createRootElementResizeObserver,
  LocalVideoOverlay,
}
