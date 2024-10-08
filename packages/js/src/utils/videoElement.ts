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

const _memberOverlayId = (id?: string) => (id ? `sw-${id}-overlay` : '')

export interface LocalOverlay {
  readonly id: string
  status: 'hidden' | 'visible'
  domElement: HTMLDivElement | undefined
  hide(): void
  show(): void
  setLocalOverlayMediaStream(stream: MediaStream): void
  setLocalOverlayMirror(mirror?: boolean): void
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

    const { layers = [] } = layout

    if (!layers.some(({ member_id }) => member_id === myMemberId)) {
      getLogger().debug('Location not found')
      let myLayer = localOverlay.domElement
      if (myLayer) {
        getLogger().debug('Current layer not visible')
        localOverlay.status = 'hidden'
        localOverlay.hide()
      }
    }

    layers.forEach((location) => {
      try {
        const isMyLayer = location.member_id === myMemberId
        console.log('#########################################')
        console.log(`isMyLayer: ${isMyLayer}, ${myMemberId}`, JSON.stringify(location, null, 2))
        console.log('#########################################')

        const mcuLayers = rootElement.querySelector('.mcuLayers')
        const memberOverlays = (
          mcuLayers ? Array.from(mcuLayers.children) : []
        ) as HTMLDivElement[]
        let memberOverlay = memberOverlays.find(
          (overlay) => overlay.id === _memberOverlayId(location.member_id)
        )

        if (!memberOverlay) {
          memberOverlay = _buildLayer({ location })
          memberOverlay.id = _memberOverlayId(location.member_id)

          if (isMyLayer) {
            console.log('Build myLayer')
            const videoLayer = document.createElement('div')
            videoLayer.id = localOverlay.id
            const localVideo = buildVideo()
            localVideo.srcObject = localStream
            localVideo.disablePictureInPicture = false
            localVideo.style.width = '100%'
            localVideo.style.height = '100%'
            localVideo.style.pointerEvents = 'none'
            localVideo.style.objectFit = 'cover'
            videoLayer.appendChild(localVideo)
            memberOverlay.appendChild(videoLayer)
            localOverlay.domElement = videoLayer
            localOverlay.setLocalOverlayMirror()
            localOverlay.status = 'visible'
            console.log('Build myLayer append it')
          }

          console.log('append to', mcuLayers)
          mcuLayers?.appendChild(memberOverlay)
        } else {
          const { top, left, width, height } = _getLocationStyles(location)
          memberOverlay.style.top = top
          memberOverlay.style.left = left
          memberOverlay.style.width = width
          memberOverlay.style.height = height

          if (isMyLayer) {
            localOverlay.status = 'visible'
            const hasVideo =
              localStream
                .getVideoTracks()
                .filter((t) => t.enabled && t.readyState === 'live').length > 0
            if (hasVideo) {
              localOverlay.setLocalOverlayMediaStream(localStream)
            } else {
              localOverlay.hide()
            }
          }
        }
      } catch (error) {
        getLogger().error('Layout Changed Error', error)
      }
    })
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
