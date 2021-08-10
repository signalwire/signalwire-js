const setAudioMediaTrack = ({
  track,
  element,
}: {
  track: MediaStreamTrack
  element: HTMLAudioElement
}) => {
  element.autoplay = true
  // @ts-ignore
  element.playsinline = true
  element.srcObject = new MediaStream([track])

  track.addEventListener('ended', () => {
    element.srcObject = null
    element.remove()
  })

  return element
}

export { setAudioMediaTrack }
