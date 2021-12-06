import {
  getLogger,
  InternalVideoLayoutLayer,
  InternalVideoLayout,
} from '@signalwire/core'

const _addSDKPrefix = (input: string) => {
  return `sw-sdk-${input}`
}

const buildVideo = () => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  return video
}

const _videoReady = ({ element }: { element: HTMLVideoElement }) => {
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

const _buildLayer = async ({
  location,
  element,
}: {
  location: InternalVideoLayoutLayer
  element: HTMLVideoElement
}) => {
  if (element.readyState === HTMLMediaElement.HAVE_NOTHING) {
    await _videoReady({ element })
  }
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

interface LayoutChangedHandlerParams {
  layout: InternalVideoLayout
  myMemberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler =
  ({
    layerMap,
    element,
    rootElement,
  }: {
    layerMap: Map<string, HTMLElement>
    element: HTMLVideoElement
    rootElement: HTMLElement
  }) =>
  async ({ layout, myMemberId, localStream }: LayoutChangedHandlerParams) => {
    try {
      const { layers = [] } = layout
      const location = layers.find(({ member_id }) => member_id === myMemberId)

      const myLayerKey = _addSDKPrefix(myMemberId)
      let myLayer = layerMap.get(myLayerKey)
      if (!location) {
        if (myLayer) {
          getLogger().debug('Current layer not visible')
          myLayer.style.display = 'none'
        }

        return
      }

      if (!myLayer) {
        myLayer = await _buildLayer({ element, location })
        myLayer.id = myLayerKey

        const localVideo = buildVideo()
        localVideo.srcObject = localStream
        localVideo.style.width = '100%'
        localVideo.style.height = '100%'

        myLayer.appendChild(localVideo)

        const mcuLayers = rootElement.querySelector('.mcuLayers')
        const exists = document.getElementById(myLayerKey)
        if (mcuLayers && !exists) {
          mcuLayers.appendChild(myLayer)
          layerMap.set(myLayerKey, myLayer)
        }

        return
      }

      const { top, left, width, height } = _getLocationStyles(location)
      myLayer.style.display = 'block'
      myLayer.style.top = top
      myLayer.style.left = left
      myLayer.style.width = width
      myLayer.style.height = height
    } catch (error) {
      getLogger().error('Layout Changed Error', error)
    }
  }

const makeDisplayChangeFn = (display: 'block' | 'none') => {
  return (domId: string) => {
    const el = document.getElementById(domId)
    if (el) {
      el.style.display = display
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

export {
  buildVideo,
  cleanupElement,
  makeLayoutChangedHandler,
  makeDisplayChangeFn,
  setVideoMediaTrack,
}
