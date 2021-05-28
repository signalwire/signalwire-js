import { WebRTC } from '../../src'

const {
  setMediaElementSinkId,
  getAudioInDevices,
  getAudioOutDevices,
  supportsMediaOutput,
  enumerateDevices,
  getUserMedia,
  stopStream,
  createDeviceWatcher,
} = WebRTC

const videoElement = document.querySelector<HTMLVideoElement>('video')!
const audioInputSelect = document.querySelector<HTMLSelectElement>(
  'select#audioSource'
)!
const audioOutputSelect = document.querySelector<HTMLSelectElement>(
  'select#audioOutput'
)!
const videoSelect = document.querySelector<HTMLSelectElement>(
  'select#videoSource'
)!

audioOutputSelect.disabled = !supportsMediaOutput()

function setDeviceOptions({
  deviceInfos,
  el,
  kind,
}: {
  deviceInfos?: MediaDeviceInfo[]
  el: HTMLSelectElement
  kind: 'microphone' | 'speaker' | 'camera'
}) {
  if (!deviceInfos || deviceInfos.length === 0) {
    return
  }

  // Store the previously selected value so we could restore it after
  // re-populating the list
  const selectedValue = el.value

  // Empty the Select
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }

  deviceInfos.forEach((deviceInfo) => {
    const option = document.createElement('option')

    option.value = deviceInfo.deviceId
    option.text = deviceInfo.label || `${kind} ${el.length + 1}`

    el.appendChild(option)
  })

  el.value = selectedValue || deviceInfos[0].deviceId
}

async function setAudioInDevicesOptions() {
  const audioInputOptions = await getAudioInDevices()

  setDeviceOptions({
    deviceInfos: audioInputOptions,
    el: audioInputSelect,
    kind: 'microphone',
  })
}

async function setAudioOutDevicesOptions() {
  if (supportsMediaOutput()) {
    const options = await getAudioOutDevices()

    setDeviceOptions({
      deviceInfos: options,
      el: audioOutputSelect,
      kind: 'speaker',
    })
  }
}

async function setVideoDevicesOptions() {
  const options = await getAudioInDevices()

  setDeviceOptions({
    deviceInfos: options,
    el: videoSelect,
    kind: 'camera',
  })
}

function initDeviceOptions() {
  setAudioInDevicesOptions()
  setAudioOutDevicesOptions()
  setVideoDevicesOptions()
}

enumerateDevices().then(initDeviceOptions).catch(handleError)

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value
  setMediaElementSinkId(videoElement, audioDestination)
}

function initStream(stream: MediaStream) {
  // @ts-ignore
  window.stream = stream
  videoElement.srcObject = stream
}

function handleError(error: Error) {
  console.log(
    'navigator.MediaDevices.getUserMedia error: ',
    error.message,
    error.name
  )
}

async function start() {
  // @ts-ignore
  stopStream(window.stream)

  const audioSource = audioInputSelect.value
  const videoSource = videoSelect.value
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  }

  try {
    const stream = await getUserMedia(constraints)

    const deviceWatcher = await createDeviceWatcher()

    deviceWatcher.on('changed', () => {
      initDeviceOptions()
    })

    initStream(stream)
    initDeviceOptions()
  } catch (e) {
    handleError(e)
  }
}

audioInputSelect.onchange = start
audioOutputSelect.onchange = changeAudioDestination
videoSelect.onchange = start

start()
