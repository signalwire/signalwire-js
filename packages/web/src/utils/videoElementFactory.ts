const buildVideoElementByTrack = (videoTrack: MediaStreamTrack) => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  const mediaStream = new MediaStream([videoTrack])
  video.srcObject = mediaStream

  const onCanPlay = () => console.debug('video can play!')
  const onPlay = () => console.debug('video is now playing...')
  video.addEventListener('play', onPlay)
  video.addEventListener('canplay', onCanPlay)
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

  const onCanPlay = () => console.debug('audio can play!')
  const onPlay = () => console.debug('audio is now playing...')
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

export const videoElementFactory = (rootElementId: string) => {
  let videoEl: HTMLMediaElement
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
        videoEl.style.border = '2px solid yellow'

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
        paddingWrapper.style.border = '2px solid green'
        paddingWrapper.appendChild(mcuWrapper)

        const layersWrapper = document.createElement('div')
        layersWrapper.classList.add('mcuLayers')
        paddingWrapper.appendChild(layersWrapper)

        const relativeWrapper = document.createElement('div')
        relativeWrapper.style.position = 'relative'
        relativeWrapper.style.width = '100%'
        relativeWrapper.style.height = '100%'
        relativeWrapper.style.margin = '0 auto'
        relativeWrapper.style.border = '2px solid red'
        relativeWrapper.appendChild(paddingWrapper)

        rootElement.appendChild(relativeWrapper)
        break
      }
    }
  }

  // const roomJoinedHandler = () => {
  //   const video = getVideo()
  //   if (video) {
  //   }
  // }

  // const layoutChangedHandler = () => {
  //   const video = getVideo()
  //   if (video) {
  //   }
  // }

  return {
    rtcTrackHandler,
    // roomJoinedHandler,
    // layoutChangedHandler,
  }
}
