import { SignalWire, buildVideoElement } from '@signalwire/js'
import {
  enumerateDevices,
  checkPermissions,
  getCameraDevicesWithPermissions,
  getMicrophoneDevicesWithPermissions,
  getSpeakerDevicesWithPermissions,
  getMicrophoneDevices,
  getCameraDevices,
  getSpeakerDevices,
  supportsMediaOutput,
  createDeviceWatcher,
  createMicrophoneAnalyzer,
} from '@signalwire/webrtc'

window.getMicrophoneDevices = getMicrophoneDevices
window.getCameraDevices = getCameraDevices
window.getSpeakerDevices = getSpeakerDevices
window.checkPermissions = checkPermissions
window.getCameraDevicesWithPermissions = getCameraDevicesWithPermissions
window.getMicrophoneDevicesWithPermissions = getMicrophoneDevicesWithPermissions
window.getSpeakerDevicesWithPermissions = getSpeakerDevicesWithPermissions

let roomObj = null
let client = null
let micAnalyzer = null

const inCallElements = [
  btnHangup,
  roomControls,
  muteSelfBtn,
  unmuteSelfBtn,
  muteVideoSelfBtn,
  unmuteVideoSelfBtn,
  deafSelfBtn,
  undeafSelfBtn,
  raiseHandBtn,
  lowerHandBtn,
  controlSliders,
  controlLayout,
  hideVMutedBtn,
  showVMutedBtn,
  lockRoomBtn,
  unlockRoomBtn,
  holdCallBtn,
  unholdCallBtn,
  hideScreenShareBtn,
  showScreenShareBtn,
  controlRecording,
  startRecordingBtn,
  stopRecordingBtn,
  pauseRecordingBtn,
  resumeRecordingBtn,
  controlPlayback,
]

const playbackElements = [
  stopPlaybackBtn,
  pausePlaybackBtn,
  resumePlaybackBtn,
  playbackVolumeControl,
  playbackSeekAbsoluteGroup,
]

window.playbackStarted = () => {
  playBtn.classList.add('d-none')
  playBtn.disabled = true

  playbackElements.forEach((button) => {
    button.classList.remove('d-none')
    button.disabled = false
  })
}
window.playbackEnded = () => {
  playBtn.classList.remove('d-none')
  playBtn.disabled = false

  playbackElements.forEach((button) => {
    button.classList.add('d-none')
    button.disabled = true
  })
}

async function loadLayouts(currentLayoutId) {
  try {
    const { layouts } = await roomObj.getLayouts()
    const fillSelectElement = (id) => {
      const layoutEl = document.getElementById(id)
      layoutEl.innerHTML = ''

      const defOption = document.createElement('option')
      defOption.value = ''
      defOption.innerHTML =
        id === 'layout' ? 'Change layout..' : 'Select layout for ScreenShare..'
      layoutEl.appendChild(defOption)
      for (var i = 0; i < layouts.length; i++) {
        const layout = layouts[i]
        var opt = document.createElement('option')
        opt.value = layout
        opt.innerHTML = layout
        layoutEl.appendChild(opt)
      }
      if (currentLayoutId) {
        layoutEl.value = currentLayoutId
      }
    }

    fillSelectElement('layout')
    fillSelectElement('ssLayout')
  } catch (error) {
    console.warn('Error listing layout', error)
  }
}

let currentPositionId = null
async function loadPositions(layout) {
  const positionEl = document.getElementById('position')
  positionEl.innerHTML = ''

  const defOption = document.createElement('option')
  defOption.value = ''
  defOption.innerHTML = 'Change position...'
  positionEl.appendChild(defOption)

  const layers = layout.layers || []
  for (var i = 0; i < layers.length; i++) {
    const position = layers[i].position
    var opt = document.createElement('option')
    opt.value = position
    opt.innerHTML = position
    positionEl.appendChild(opt)
  }
  if (currentPositionId) {
    positionEl.value = currentPositionId
  }
}

function setDeviceOptions({ deviceInfos, el, kind }) {
  if (!deviceInfos || deviceInfos.length === 0) {
    return
  }

  // Store the previously selected value so we could restore it after
  // re-populating the list
  const selectedValue = el.value

  // Empty the Select
  el.innerHTML = ''

  deviceInfos.forEach((deviceInfo) => {
    const option = document.createElement('option')

    option.value = deviceInfo.deviceId
    option.text = deviceInfo.label || `${kind} ${el.length + 1}`

    el.appendChild(option)
  })

  el.value = selectedValue || deviceInfos[0].deviceId
}

async function setAudioInDevicesOptions() {
  const micOptions = await getMicrophoneDevices()

  setDeviceOptions({
    deviceInfos: micOptions,
    el: microphoneSelect,
    kind: 'microphone',
  })
}

async function setAudioOutDevicesOptions() {
  if (supportsMediaOutput()) {
    const options = await getSpeakerDevices()

    setDeviceOptions({
      deviceInfos: options,
      el: speakerSelect,
      kind: 'speaker',
    })
  }
}

async function setVideoDevicesOptions() {
  const options = await getCameraDevices()

  setDeviceOptions({
    deviceInfos: options,
    el: cameraSelect,
    kind: 'camera',
  })
}

function initDeviceOptions() {
  setAudioInDevicesOptions()
  setAudioOutDevicesOptions()
  setVideoDevicesOptions()
}

function meter(el, val) {
  const canvasWidth = el.width
  const canvasHeight = el.height
  const ctx = el.getContext('2d')
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Border
  ctx.beginPath()
  ctx.rect(0, 0, canvasWidth, canvasHeight)
  ctx.strokeStyle = '#0f5e39'
  ctx.stroke()

  // Meter fill
  ctx.beginPath()
  ctx.rect(0, canvasHeight, canvasWidth, -val)
  ctx.stroke()
  ctx.fillStyle = '#198754'
  ctx.fill()
  ctx.stroke()
}

const initializeMicAnalyzer = async (stream) => {
  if (!stream) {
    return
  }

  const el = document.getElementById('mic-meter')
  micAnalyzer = await createMicrophoneAnalyzer(stream)
  micAnalyzer.on('volumeChanged', (vol) => {
    meter(el, vol)
  })
  micAnalyzer.on('destroyed', (reason) => {
    console.log('Microphone analyzer destroyed', reason)
  })
}

function restoreUI() {
  connectStatus.innerHTML = 'Call Disconnected'

  btnDial.classList.remove('d-none')
  btnDisconnect.classList.remove('d-none')

  inCallElements.forEach((button) => {
    button.classList.add('d-none')
    button.disabled = true
  })
}

/**
 * Connect the Fabric client (start the WebSocket connection with Auth).
 */
window.connect = async () => {
  connectStatus.innerHTML = 'Connecting...'

  client = await SignalWire({
    host: document.getElementById('host').value,
    token: document.getElementById('token').value,
    logLevel: 'debug',
    debug: { logWsTraffic: true },
  })
  window.__client = client

  /**
   * Following are the internal SDK session events
   */
  client.__wsClient.session.on('session.connected', () => {
    console.debug('>> session.connected')
  })
  client.__wsClient.session.on('session.auth_error', (error) => {
    console.debug('>> session.auth_error', error)
  })
  client.__wsClient.session.on('session.disconnecting', () => {
    console.debug('>> session.disconnecting')
  })
  client.__wsClient.session.on('session.disconnected', () => {
    console.debug('>> session.disconnected')
  })
  client.__wsClient.session.on('session.expiring', () => {
    console.debug('>> session.expiring')
  })
  client.__wsClient.session.on('session.idle', () => {
    console.debug('>> session.idle')
  })
  client.__wsClient.session.on('session.reconnecting', () => {
    console.debug('>> session.reconnecting')
  })
  client.__wsClient.session.on('session.unknown', () => {
    console.debug('>> session.unknown')
  })

  connectStatus.innerHTML = 'Connected'

  btnConnect.classList.add('d-none')
  btnDial.classList.remove('d-none')
  btnDisconnect.classList.remove('d-none')

  removeRoomFromURL()
}

/**
 * Dial the Fabric Address
 */
window.dial = async ({ reattach = false } = {}) => {
  connectStatus.innerHTML = 'Dialing...'

  // Set a node_id for steering
  const steeringId = undefined

  const dialer = reattach ? client.reattach : client.dial

  const call = await dialer({
    nodeId: steeringId,
    to: document.getElementById('destination').value,
    rootElement: document.getElementById('rootElement'),
    video: document.getElementById('video').checked,
    audio: document.getElementById('audio').checked,
    maxOpusPlaybackRate: parseInt(document.getElementById('opusConfig').value)
  })

  window.__call = call
  roomObj = call

  roomObj.on('call.state', (params) => {
    console.debug('>> call.state', params)
  })
  roomObj.on('call.joined', (params) => {
    console.debug('>> call.joined', params)
  })
  roomObj.on('call.updated', (params) => {
    console.debug('>> call.updated', params)
  })
  roomObj.on('call.left', (params) => {
    console.debug('>> call.left', params)
  })
  roomObj.on('call.play', (params) => {
    console.debug('>> call.play', params)
  })
  roomObj.on('call.connect', (params) => {
    console.debug('>> call.connect', params)
  })
  roomObj.on('call.room', (params) => {
    console.debug('>> call.room', params)
  })

  roomObj.on('room.subscribed', (params) =>
    console.debug('>> room.subscribed', params)
  )
  roomObj.on('room.joined', (params) => {
    console.debug('>> room.joined ', params)

    addRoomToURL(params.room_session.name)
  })
  roomObj.on('room.updated', (params) =>
    console.debug('>> room.updated', params)
  )
  roomObj.on('room.left', (params) => {
    console.debug('>> room.left', params)
  })
  roomObj.on('room.ended', (params) => {
    console.debug('>> room.ended', params)
    hangup()
  })

  roomObj.on('member.joined', (params) =>
    console.debug('>> member.joined', params)
  )
  roomObj.on('member.updated', (params) =>
    console.debug('>> member.updated', params)
  )
  roomObj.on('member.updated.audioMuted', (params) =>
    console.debug('>> member.updated.audioMuted', params)
  )
  roomObj.on('member.updated.videoMuted', (params) =>
    console.debug('>> member.updated.videoMuted', params)
  )
  roomObj.on('member.left', (params) => console.debug('>> member.left', params))
  roomObj.on('member.talking', (params) =>
    console.debug('>> member.talking', params)
  )

  roomObj.on('media.connected', () => {
    console.debug('>> media.connected')
  })
  roomObj.on('media.reconnecting', () => {
    console.debug('>> media.reconnecting')
  })
  roomObj.on('media.disconnected', () => {
    console.debug('>> media.disconnected')
  })

  // CF SDK does not support recording events yet
  roomObj.on('recording.started', (params) => {
    console.debug('>> recording.started', params)
    document.getElementById('recordingState').innerText = 'recording'
  })
  roomObj.on('recording.ended', (params) => {
    console.debug('>> recording.ended', params)
    document.getElementById('recordingState').innerText = 'completed'
  })
  roomObj.on('recording.updated', (params) => {
    console.debug('>> recording.updated', params)
    document.getElementById('recordingState').innerText = params.state
  })

  // CF SDK does not support playback events yet
  roomObj.on('playback.started', (params) => {
    console.debug('>> playback.started', params)
    playbackStarted()
  })
  roomObj.on('playback.ended', (params) => {
    console.debug('>> playback.ended', params)
    playbackEnded()
  })
  roomObj.on('playback.updated', (params) => {
    console.debug('>> playback.updated', params)
    if (params.volume) {
      document.getElementById('playbackVolume').value = params.volume
    }
  })

  roomObj.on('layout.changed', (params) => {
    console.debug('>> layout.changed', params)
    loadPositions(params.layout)
  })

  roomObj.on('track', (event) => console.debug('>> DEMO track', event))

  roomObj.on('destroy', () => {
    console.debug('>> destroy')
    restoreUI()
  })

  await call.start()
  console.debug('Call Obj', call)

  /* --------- Render video element using custom function ---------- */
  // setTimeout(async () => {
  //   const { unsubscribe } = await buildVideoElement({
  //     room: call,
  //     rootElement: document.getElementById('random1'),
  //   })

  //   setTimeout(async () => {
  //     const { element } = await buildVideoElement({
  //       room: call,
  //     })
  //     const root = document.getElementById('random2')
  //     root.appendChild(element)

  //     setTimeout(() => {
  //       unsubscribe()
  //     }, 10000)
  //   }, 5000)
  // }, 5000)

  enumerateDevices()
    .then(initDeviceOptions)
    .catch((error) => {
      console.error('EnumerateDevices error', error)
    })

  const joinHandler = (params) => {
    connectStatus.innerHTML = 'Call Connected'

    btnConnect.classList.add('d-none')
    btnDial.classList.add('d-none')
    btnDisconnect.classList.add('d-none')

    inCallElements.forEach((button) => {
      button.classList.remove('d-none')
      button.disabled = false
    })
    loadLayouts()
  }
  joinHandler()
}

/**
 * Hangup the roomObj if present
 */
window.hangup = async () => {
  if (micAnalyzer) {
    micAnalyzer.destroy()
  }

  if (roomObj) {
    await roomObj.hangup()
  }

  restoreUI()

  removeRoomFromURL()
}

/**
 * Disconnect the Call Fabric client
 */
window.disconnect = async () => {
  await client.disconnect()
  connectStatus.innerHTML = 'Disconnected'

  client = null

  btnConnect.classList.remove('d-none')
  btnHangup.classList.add('d-none')
  btnDial.classList.add('d-none')
  btnDisconnect.classList.add('d-none')

  removeRoomFromURL()
}

// Set or update the query parameter 'room' with value room.name
window.addRoomToURL = (roomName) => {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomName)
  window.history.replaceState({}, '', url)
}

// Remove the 'room' query parameter
window.removeRoomFromURL = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.replaceState({}, '', url)
}

window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  let value = e.target.value
  if (e.target.type === 'checkbox') {
    value = e.target.checked
  }
  localStorage.setItem('fabric.ws.' + key, value)
}

// jQuery document.ready equivalent
window.ready = (callback) => {
  if (document.readyState != 'loading') {
    callback()
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callback)
  } else {
    document.attachEvent('onreadystatechange', function () {
      if (document.readyState != 'loading') {
        callback()
      }
    })
  }
}

let screenShareObj
window.startScreenShare = async () => {
  let opts = {}
  const ssPos = document.getElementById('ssPosition')?.value || ''
  if (ssPos.trim()) {
    opts = {
      positions: {
        self: ssPos.trim(),
      },
    }
  }
  const layout = document.getElementById('ssLayout').value.trim()
  if (layout) {
    opts.layout = layout
  }
  screenShareObj = await roomObj
    .startScreenShare({
      audio: true,
      video: true,
      ...opts,
    })
    .catch((error) => {
      console.error('ScreenShare Error', error)
    })

  screenShareObj.once('destroy', () => {
    console.debug('>> screenShare destroy')
  })

  screenShareObj.once('room.left', () => {
    console.debug('>> screenShare room.left')
  })
}
window.stopScreenShare = () => {
  screenShareObj.hangup()
}

window.muteAll = () => {
  roomObj.audioMute({ memberId: 'all' })
}

window.unmuteAll = () => {
  roomObj.audioUnmute({ memberId: 'all' })
}

window.muteSelf = () => {
  roomObj.audioMute()
}

window.unmuteSelf = () => {
  roomObj.audioUnmute()
}

window.muteVideoAll = () => {
  roomObj.videoMute({ memberId: 'all' })
}

window.unmuteVideoAll = () => {
  roomObj.videoUnmute({ memberId: 'all' })
}

window.muteVideoSelf = () => {
  roomObj.videoMute()
}

window.unmuteVideoSelf = () => {
  roomObj.videoUnmute()
}

window.deafSelf = () => {
  roomObj.deaf()
}

window.undeafSelf = () => {
  roomObj.undeaf()
}

window.hideVideoMuted = () => {
  roomObj.hideVideoMuted()
}

window.showVideoMuted = () => {
  roomObj.showVideoMuted()
}

window.raiseHand = () => {
  roomObj.setRaisedHand({ raised: true })
}

window.lowerHand = () => {
  roomObj.setRaisedHand({ raised: false })
}

window.lockRoom = () => {
  roomObj.lock()
}

window.unlockRoom = () => {
  roomObj.unlock()
}

window.holdCall = () => {
  roomObj.hold()
}

window.unholdCall = () => {
  roomObj.unhold()
}

window.changeLayout = (select) => {
  roomObj.setLayout({ name: select.value })
}

window.changePosition = (select) => {
  roomObj.setPositions({ positions: { self: select.value } })
  currentPositionId = select.value
}

window.changeMicrophone = (select) => {
  if (!select.value) {
    return
  }
  roomObj.updateMicrophone({ deviceId: select.value }).then(() => {
    initializeMicAnalyzer(roomObj.localStream)
  })
}

window.changeCamera = (select) => {
  if (!select.value) {
    return
  }
  roomObj.updateCamera({ deviceId: select.value })
}

window.changeSpeaker = (select) => {
  if (!select.value) {
    return
  }
  roomObj
    .updateSpeaker({ deviceId: select.value })
    .then(() => {
      console.log('Speaker updated!')
    })
    .catch(() => {
      console.error(`Failed to update the speaker with id: ${select.value}`)
    })
}

window.rangeInputHandler = (range) => {
  switch (range.id) {
    case 'microphoneVolume':
      roomObj.setMicrophoneVolume({ volume: range.value })
      break
    case 'speakerVolume':
      roomObj.setSpeakerVolume({ volume: range.value })
      break
    case 'inputSensitivity':
      roomObj.setInputSensitivity({ value: range.value })
      break
    case 'playbackVolume': {
      if (!playbackObj) {
        return console.warn('Invalid playbackObj for `setVolume`')
      }
      playbackObj
        .setVolume(range.value)
        .then((response) => {
          console.log('Playback setVolume:', response)
        })
        .catch((error) => {
          console.error('Failed to set the playback volume:', error)
        })
      break
    }
  }
}

let recordingObj = null
window.startRecording = () => {
  console.debug('>> startRecording')
  roomObj
    .startRecording()
    .then((response) => {
      console.log('Recording started!', response)
      recordingObj = response
    })
    .catch((error) => {
      console.error('Failed to start recording:', error)
    })
}

window.stopRecording = () => {
  console.debug('>> stopRecording')
  recordingObj
    .stop()
    .then((response) => {
      console.log('Recording stopped!', response)
      recordingObj = null
    })
    .catch((error) => {
      console.error('Failed to stop recording:', error)
    })
}

window.pauseRecording = () => {
  console.debug('>> pauseRecording')
  recordingObj
    .pause()
    .then((response) => {
      console.log('Recording paused!', response)
    })
    .catch((error) => {
      console.error('Failed to pause recording:', error)
    })
}

window.resumeRecording = () => {
  console.debug('>> resumeRecording')
  recordingObj
    .resume()
    .then((response) => {
      console.log('Recording resumed!', response)
    })
    .catch((error) => {
      console.error('Failed to resume recording:', error)
    })
}

let playbackObj = null
window.startPlayback = () => {
  const url = document.getElementById('playbackUrl').value
  if (!url) {
    return console.warn('Invalid playback URL')
  }
  console.debug('>> startPlayback', url)
  roomObj
    .play({ url, volume: 10 })
    .then((response) => {
      console.log('Playback started!', response)
      playbackObj = response
    })
    .catch((error) => {
      console.error('Failed to start playback:', error)
    })
}

window.stopPlayback = () => {
  console.debug('>> stopPlayback')
  playbackObj
    .stop()
    .then((response) => {
      console.log('Playback stopped!', response)
      playbackObj = null
    })
    .catch((error) => {
      console.error('Failed to stop playback:', error)
    })
}

window.pausePlayback = () => {
  console.debug('>> pausePlayback')
  playbackObj
    .pause()
    .then((response) => {
      console.log('Playback paused!', response)
    })
    .catch((error) => {
      console.error('Failed to pause playback:', error)
    })
}

window.resumePlayback = () => {
  console.debug('>> resumePlayback')
  playbackObj
    .resume()
    .then((response) => {
      console.log('Playback resumed!', response)
    })
    .catch((error) => {
      console.error('Failed to resume playback:', error)
    })
}

window.seekPlayback = () => {
  const value = document.getElementById('playbackSeekAbsolute').value
  if (!value) {
    return console.warn('Invalid Seek Value')
  } else if (!playbackObj) {
    return console.warn("playbackObj doesn't exist")
  }
  console.debug('>> seekPlaybackBtn', value)
  playbackObj
    .seek(value)
    .then(() => {
      console.log('Playback.seek was successful')
    })
    .catch((error) => {
      console.error('Failed to seek playback:', error)
    })
}

window.seekRewindPlayback = () => {
  if (!playbackObj) {
    return console.warn("playbackObj doesn't exist")
  }
  console.debug('>> seekRewindPlayback')
  playbackObj
    .rewind(1000)
    .then(() => {
      console.log('Playback.rewind was successful')
    })
    .catch((error) => {
      console.error('Failed to rewind playback:', error)
    })
}

window.seekForwardPlayback = () => {
  if (!playbackObj) {
    return console.warn("playbackObj doesn't exist")
  }
  console.debug('>> seekForwardPlayback')
  playbackObj
    .forward(1000)
    .then(() => {
      console.log('Playback.forward was successful')
    })
    .catch((error) => {
      console.error('Failed to forward playback:', error)
    })
}

/**
 * On document ready auto-fill the input values from the localStorage.
 */
window.ready(async function () {
  document.getElementById('host').value =
    localStorage.getItem('fabric.ws.host') || ''
  document.getElementById('token').value =
    localStorage.getItem('fabric.ws.token') || ''
  document.getElementById('destination').value =
    localStorage.getItem('fabric.ws.destination') || ''
  document.getElementById('audio').checked = true
  document.getElementById('video').checked =
    localStorage.getItem('fabric.ws.video') === 'true'
  document.getElementById('opusConfig').value =
    localStorage.getItem('fabric.ws.opusConfig') || ''

  const urlParams = new URLSearchParams(window.location.search)
  const room = urlParams.get('room')
  if (room) {
    await connect()
    await dial({ reattach: true })
  } else {
    console.log('Room parameter not found')
  }
})
