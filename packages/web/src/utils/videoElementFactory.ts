import { logger } from '@signalwire/core'

const buildVideoElementByTrack = (videoTrack: MediaStreamTrack) => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  const mediaStream = new MediaStream([videoTrack])
  video.srcObject = mediaStream

  const onCanPlay = () => logger.debug('Video can play')
  const onPlay = () => logger.debug('Video is playing')
  videoTrack.addEventListener('ended', () => {
    video.removeEventListener('play', onPlay)
    video.removeEventListener('canplay', onCanPlay)
    video.srcObject = null
    video.remove()
  })
  return video
}

const buildAudioElementByTrack = (audioTrack: MediaStreamTrack) => {
  const audio = new Audio()
  audio.autoplay = true
  // @ts-ignore
  audio.playsinline = true

  const mediaStream = new MediaStream([audioTrack])
  audio.srcObject = mediaStream

  const onCanPlay = () => logger.debug('Audio can play!')
  const onPlay = () => logger.debug('Audio is playing')
  audio.addEventListener('play', onPlay)
  audio.addEventListener('canplay', onCanPlay)
  audioTrack.addEventListener('ended', () => {
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('canplay', onCanPlay)
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
  let audioEl: HTMLMediaElement
  // Fallback to body
  const rootElement = document.getElementById(rootElementId) || document.body

  const rtcTrackHandler = (event: RTCTrackEvent) => {
    switch (event.track.kind) {
      case 'audio':
        audioEl = buildAudioElementByTrack(event.track)
        break
      case 'video': {
        videoEl = buildVideoElementByTrack(event.track)
        videoEl.style.width = '100%'
        videoEl.style.height = '100%'
        // videoEl.style.border = '2px solid yellow'

        if (!applyLocalVideoOverlay) {
          rootElement.appendChild(videoEl)
        }

        const mcuWrapper = document.createElement('div')
        mcuWrapper.style.position = 'absolute'
        // inset: 0
        mcuWrapper.style.top = '0'
        mcuWrapper.style.left = '0'
        mcuWrapper.style.right = '0'
        mcuWrapper.style.bottom = '0'
        mcuWrapper.appendChild(videoEl)

        const paddingWrapper = document.createElement('div')
        paddingWrapper.style.paddingBottom = '56.25%'
        // paddingWrapper.style.border = '2px solid green'
        paddingWrapper.appendChild(mcuWrapper)

        const layersWrapper = document.createElement('div')
        layersWrapper.classList.add('mcuLayers')
        paddingWrapper.appendChild(layersWrapper)

        const relativeWrapper = document.createElement('div')
        relativeWrapper.style.position = 'relative'
        relativeWrapper.style.width = '100%'
        relativeWrapper.style.height = '100%'
        relativeWrapper.style.margin = '0 auto'
        // relativeWrapper.style.border = '2px solid red'
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

  const _buildLayer = async ({ x, y, width, height }: any) => {
    if (videoEl.readyState === HTMLMediaElement.HAVE_NOTHING) {
      await _videoReady()
    }
    const layer = document.createElement('div')
    layer.style.position = 'absolute'
    layer.style.overflow = 'hidden'
    // TODO: scale x/y too
    layer.style.top = `${(videoEl.offsetWidth * x) / videoEl.videoWidth}px`
    layer.style.left = `${(videoEl.offsetHeight * y) / videoEl.videoHeight}px`
    logger.debug(
      '_buildLayer width',
      videoEl.offsetWidth,
      width,
      videoEl.videoWidth
    )
    layer.style.width = `${
      (videoEl.offsetWidth * width) / videoEl.videoWidth
    }px`
    logger.debug(
      '_buildLayer height',
      videoEl.offsetHeight,
      height,
      videoEl.videoHeight
    )
    layer.style.height = `${
      (videoEl.offsetHeight * height) / videoEl.videoHeight
    }px`
    return layer
  }

  const destroyHandler = () => {
    while (rootElement.firstChild) {
      rootElement.removeChild(rootElement.firstChild)
    }
  }

  const roomJoinedHandler = async (
    localVideoTrack: MediaStreamTrack,
    { member_id, room }: any
  ) => {
    if (!applyLocalVideoOverlay) {
      logger.info('Do not apply local video overlay')
      return
    }
    try {
      const { members = [] } = room
      const mySelf = members.find(({ id }: any) => member_id === id)
      const myLayer = await _buildLayer(mySelf.location)
      const localVideo = buildVideoElementByTrack(localVideoTrack)
      localVideo.style.width = '100%'
      localVideo.style.height = '100%'
      myLayer.appendChild(localVideo)

      const mcuLayers = rootElement.querySelector('.mcuLayers')
      if (mcuLayers) {
        mcuLayers.appendChild(myLayer)
      } else {
        logger.warn('Missing mcuLayers wrapper')
      }
    } catch (error) {
      logger.error('Local Overlay Error', error)
    }
  }

  // const layoutChangedHandler = () => {
  //   const video = getVideo()
  //   if (video) {
  //   }
  // }

  return {
    rtcTrackHandler,
    destroyHandler,
    roomJoinedHandler,
    // layoutChangedHandler,
  }
}
