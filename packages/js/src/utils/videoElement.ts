import {
  getLogger,
  InternalVideoLayoutLayer,
  InternalVideoLayout,
  debounce,
} from '@signalwire/core'

const addSDKPrefix = (input: string) => {
  return `sw-sdk-${input}`
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

export interface LocalOverlay {
  readonly id: string
  status: 'hidden' | 'visible'
  domElement: HTMLDivElement | undefined
  hide(): void
  show(): void
  setLocalOverlayMediaStream(stream: MediaStream): void
}

interface MakeLayoutChangedHandlerParams {
  localOverlay: LocalOverlay
  rootElement: HTMLElement
}

interface LayoutChangedHandlerParams {
  layout: InternalVideoLayout
  myMemberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler =
  ({ localOverlay, rootElement }: MakeLayoutChangedHandlerParams) =>
  async ({ layout, myMemberId, localStream }: LayoutChangedHandlerParams) => {
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

      if (!myLayer) {
        getLogger().debug('Build myLayer')
        myLayer = _buildLayer({ location })
        myLayer.id = localOverlay.id

        const localVideo = buildVideo()
        localVideo.srcObject = localStream
        localVideo.disablePictureInPicture = true
        localVideo.style.width = '100%'
        localVideo.style.height = '100%'
        localVideo.style.pointerEvents = 'none'

        myLayer.appendChild(localVideo)

        const mcuLayers = rootElement.querySelector('.mcuLayers')
        const exists = mcuLayers?.querySelector(`#${myLayer.id}`)
        if (mcuLayers && !exists) {
          mcuLayers.appendChild(myLayer)
          localOverlay.domElement = myLayer
        }

        return
      }

      const { top, left, width, height } = _getLocationStyles(location)
      getLogger().debug('Update myLayer:', top, left, width, height)
      /**
       * Show myLayer only if the localStream has a valid video track
       */
      const hasVideo = localStream.getVideoTracks().length > 0
      myLayer.style.opacity = hasVideo ? '1' : '0'
      myLayer.style.top = top
      myLayer.style.left = left
      myLayer.style.width = width
      myLayer.style.height = height
    } catch (error) {
      getLogger().error('Layout Changed Error', error)
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
  const getWX = () => {
    const nativeVideoRatio = video.videoWidth / video.videoHeight
    const clientSideRatio = rootElement.clientWidth / rootElement.clientHeight
    if (nativeVideoRatio > clientSideRatio) {
      return { width: '100%' }
    } else {
      return { width: `${rootElement.clientHeight * nativeVideoRatio}px` }
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
        const coords = getWX()
        paddingWrapper.style.width = coords.width
      }
    },
    100
  )

  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      // newer api but less supported
      if (entry.contentBoxSize?.length) {
        update({
          width: entry.contentBoxSize[0].inlineSize,
          height: entry.contentBoxSize[0].blockSize,
        })
      } else if (entry?.contentRect) {
        // fallback to older api may eventually be deprecated
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
