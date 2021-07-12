import { logger, RoomLayout, RoomLayoutLayer } from '@signalwire/core'

type LayoutChangedHandlerParams = {
  layout: RoomLayout
  myMemberId: string
  localStream: MediaStream
}

export const buildVideo = () => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  return video
}

export const buildVideoElementByTrack = (videoTrack: MediaStreamTrack) => {
  const video = buildVideo()
  video.srcObject = new MediaStream([videoTrack])

  videoTrack.addEventListener('ended', () => {
    video.srcObject = null
    video.remove()
  })
  return video
}

export const buildAudioElementByTrack = (audioTrack: MediaStreamTrack) => {
  const audio = new Audio()
  audio.autoplay = true
  // @ts-ignore
  audio.playsinline = true
  audio.srcObject = new MediaStream([audioTrack])

  audioTrack.addEventListener('ended', () => {
    audio.srcObject = null
    audio.remove()
  })

  return audio
}

type VideoElementFactoryParams = {
  rootElementId: string
  applyLocalVideoOverlay?: boolean
}
export const videoElementFactory = ({
  rootElementId,
  applyLocalVideoOverlay = true,
}: VideoElementFactoryParams) => {
  let videoEl: HTMLVideoElement
  // Fallback to body
  const rootElement = document.getElementById(rootElementId) || document.body
  const layerMap = new Map()

  const rtcTrackHandler = (event: RTCTrackEvent) => {
    switch (event.track.kind) {
      case 'audio':
        buildAudioElementByTrack(event.track)
        break
      case 'video': {
        videoEl = buildVideoElementByTrack(event.track)
        videoEl.style.width = '100%'
        videoEl.style.height = '100%'

        if (!applyLocalVideoOverlay) {
          rootElement.appendChild(videoEl)
          return
        }

        const mcuWrapper = document.createElement('div')
        mcuWrapper.style.position = 'absolute'
        mcuWrapper.style.top = '0'
        mcuWrapper.style.left = '0'
        mcuWrapper.style.right = '0'
        mcuWrapper.style.bottom = '0'
        mcuWrapper.appendChild(videoEl)

        const paddingWrapper = document.createElement('div')
        paddingWrapper.style.paddingBottom = '56.25%'
        paddingWrapper.appendChild(mcuWrapper)

        const layersWrapper = document.createElement('div')
        layersWrapper.classList.add('mcuLayers')
        paddingWrapper.appendChild(layersWrapper)

        const relativeWrapper = document.createElement('div')
        relativeWrapper.style.position = 'relative'
        relativeWrapper.style.width = '100%'
        relativeWrapper.style.height = '100%'
        relativeWrapper.style.margin = '0 auto'
        relativeWrapper.appendChild(paddingWrapper)

        rootElement.appendChild(relativeWrapper)
        break
      }
    }
  }

  const _videoReady = () => {
    return new Promise<void>((resolve) => {
      videoEl.addEventListener('canplay', function listener() {
        videoEl.removeEventListener('canplay', listener)
        resolve()
      })
      videoEl.addEventListener('resize', function listener() {
        videoEl.removeEventListener('resize', listener)
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

  const _buildLayer = async (location: RoomLayoutLayer) => {
    if (videoEl.readyState === HTMLMediaElement.HAVE_NOTHING) {
      await _videoReady()
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

  const destroyHandler = () => {
    while (rootElement.firstChild) {
      rootElement.removeChild(rootElement.firstChild)
    }
  }

  const layoutChangedHandler = async ({
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
        const myLayer = await _buildLayer(layer)
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

  return {
    rtcTrackHandler,
    destroyHandler,
    layoutChangedHandler,
    showOverlay: makeDisplayChangeFn('block'),
    hideOverlay: makeDisplayChangeFn('none'),
  }
}
