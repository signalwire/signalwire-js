import { logger, RoomLayoutLayer, RoomLayout } from '@signalwire/core'

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

const _getLocationStyles = ({ x, y, width, height }: RoomLayoutLayer) => {
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
  location: RoomLayoutLayer
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
  layout: RoomLayout
  myMemberId: string
  localStream: MediaStream
}

const makeLayoutChangedHandler = ({
  layerMap,
  element,
  rootElement,
}: {
  layerMap: Map<string, HTMLElement>
  element: HTMLVideoElement
  rootElement: HTMLElement
}) => async ({
  layout,
  myMemberId,
  localStream,
}: LayoutChangedHandlerParams) => {
  try {
    const { layers = [] } = layout
    const layer = layers.find(({ member_id }) => member_id === myMemberId)

    if (!layer) {
      return logger.debug('Current Layer Not Found', JSON.stringify(layout))
    }

    let myLayer = layerMap.get(myMemberId)
    if (!myLayer) {
      const myLayer = await _buildLayer({ element, location: layer })
      myLayer.id = myMemberId

      const localVideo = buildVideo()
      localVideo.srcObject = localStream
      localVideo.style.width = '100%'
      localVideo.style.height = '100%'

      myLayer.appendChild(localVideo)

      layerMap.set(myMemberId, myLayer)
      const mcuLayers = rootElement.querySelector('.mcuLayers')
      const exists = document.getElementById(myMemberId)
      if (mcuLayers && !exists) {
        mcuLayers.appendChild(myLayer)
      }

      return
    }

    const { top, left, width, height } = _getLocationStyles(layer)
    myLayer.style.top = top
    myLayer.style.left = left
    myLayer.style.width = width
    myLayer.style.height = height
  } catch (error) {
    logger.error('Layout Changed Error', error)
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

const makeDestroyHandler = ({
  layerMap,
  rootElement,
}: {
  layerMap: Map<string, HTMLElement>
  rootElement: HTMLElement
}) => () => {
  while (rootElement.firstChild) {
    rootElement.removeChild(rootElement.firstChild)
  }
  layerMap.clear()
}

export {
  buildVideo,
  makeLayoutChangedHandler,
  makeDestroyHandler,
  makeDisplayChangeFn,
}
