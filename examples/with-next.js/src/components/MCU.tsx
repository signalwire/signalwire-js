import { useEffect, useRef } from 'react'

interface MCUProps {
  stream: MediaStream
}

export const MCU = ({ stream }: MCUProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let video: HTMLVideoElement
    if (stream) {
      console.debug('stream', stream)
      video = document.createElement('video')
      // video.muted = false
      video.autoplay = true
      video.playsInline = true
      video.srcObject = stream
      video.classList.add(
        ...'w-full max-w-full h-full max-h-full object-cover'.split(' ')
      )
      // @ts-ignore
      wrapperRef.current.appendChild(video)
      video.play().catch(() => console.error('LocalVideo cannot play?'))
    }
    return () => {
      console.debug('clear?', video)
      if (video) {
        stream?.getTracks().forEach((track) => track.stop())
        video.srcObject = null
        video.remove()
      }
    }
  }, [stream])

  return <div ref={wrapperRef} className='w-full h-40 bg-indigo-100'></div>
}
