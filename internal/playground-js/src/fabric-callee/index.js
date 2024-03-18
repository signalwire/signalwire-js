import Pako from 'pako'
import { SignalWire } from '@signalwire/js'
import {
  createMicrophoneAnalyzer,
  enumerateDevices,
  getMicrophoneDevices,
  getCameraDevices,
  getSpeakerDevices,
  supportsMediaOutput,
} from '@signalwire/webrtc'
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

let roomObj = null
let client = null
let micAnalyzer = null

const inCallElements = [
  roomControls,
  muteSelfBtn,
  unmuteSelfBtn,
  muteVideoSelfBtn,
  unmuteVideoSelfBtn,
  deafSelfBtn,
  undeafSelfBtn,
  controlSliders,
  controlLayout,
  hideVMutedBtn,
  showVMutedBtn,
  hideScreenShareBtn,
  showScreenShareBtn,
  controlRecording,
  startRecordingBtn,
  stopRecordingBtn,
  pauseRecordingBtn,
  resumeRecordingBtn,
  controlPlayback,

  tapPushNotificationBtn,
  acceptCallBtn,
  rejectCallBtn,
  rejectAllCallsBtn,
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
  btnConnect.classList.remove('d-none')
  tapPushNotificationBtn.classList.add('d-none')
  btnDisconnect.classList.add('d-none')
  connectStatus.innerHTML = 'Not Connected'

  inCallElements.forEach((button) => {
    button.classList.add('d-none')
    button.disabled = true
  })
}

function uiReady() {
  connectStatus.innerHTML = 'In Call'

  inCallElements.forEach((button) => {
    button.classList.remove('d-none')
    button.disabled = false
  })

  enumerateDevices()
    .then(initDeviceOptions)
    .catch((error) => {
      console.error('EnumerateDevices error', error)
    })
}

function enableCallButtons() {
  acceptCallBtn.disabled = false
  rejectCallBtn.disabled = false
  rejectAllCallsBtn.disabled = false
}

function disableCallButtons() {
  acceptCallBtn.disabled = true
  rejectCallBtn.disabled = true
  rejectAllCallsBtn.disabled = true
}

async function getClient() {
  if (!client) {
    client = await SignalWire({
      host: document.getElementById('host').value,
      token: document.getElementById('token').value,
      rootElement: document.getElementById('rootElement'),
      onRefreshToken: async () => {
        // Fetch the new token and update the client using 👇
        // await client.updateToken(newToken)
      },
    })
  }

  return client
}

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = async () => {
  const client = await getClient()
  window.__client = client

  // const steeringId = ''
  // if (steeringId) {
  //   const executeInviteRef = call.executeInvite
  //   call.executeInvite = (sdp, rtcPeerId, nodeId) => {
  //     console.log('Change invite - inject nodeId for steering')
  //     executeInviteRef.call(call, sdp, rtcPeerId, steeringId)
  //   }

  //   const vertoExecuteRef = call.vertoExecute
  //   call.vertoExecute = (params) => {
  //     console.log('Change vertoExecute - inject nodeId for steering')
  //     params.node_id = steeringId
  //     vertoExecuteRef.call(call, params)
  //   }
  // }

  connectStatus.innerHTML = 'Connecting...'
  await client.connect()

  connectStatus.innerHTML = 'Connected!'

  btnConnect.classList.add('d-none')
  tapPushNotificationBtn.classList.remove('d-none')
  btnDisconnect.classList.remove('d-none')

  await client.online({
    incomingCallHandlers: {
      websocket: (call) => {
        console.log('call', call)
      },
    },
  })
}

/**
 * Disconnect the client
 */
window.disconnect = async () => {
  await window.__client.disconnect()
  connectStatus.innerHTML = 'Disconnected!'
  restoreUI()
}

/**
 * Read the PN payload and accept the inbound call
 */
window.tapPushNotification = async () => {
  try {
    const pnKey = document.getElementById('pn-key').value
    const pushNotificationPayload = JSON.parse(payload.value)
    const result = await readPushNotification(pushNotificationPayload, pnKey)
    console.log('PN', result)
    const { resultType, resultObject } = await client.handlePushNotification(
      result
    )

    switch (resultType) {
      case 'inboundCall':
        window.__call = resultObject
        window.__call.on('destroy', () => {
          console.warn('Inbound Call got cancelled!!')
          restoreUI()
        })
        enableCallButtons()
        connectStatus.innerHTML = 'Ringing...'
        break
      default:
        this.logger.warn('Unknown resultType', resultType, resultObject)
        return
    }
  } catch (error) {
    console.error('acceptCall', error)
  }
}

window.acceptCall = async () => {
  disableCallButtons()
  await window.__call.answer()
  uiReady()
}

window.rejectCall = async () => {
  disableCallButtons()
  await window.__call.hangup()
  restoreUI()
}

window.rejectAllCalls = async () => {
  disableCallButtons()
  await window.__call.hangupAll()
  restoreUI()
}

/**
 * Hangup the roomObj if present
 */
window.hangup = () => {
  if (micAnalyzer) {
    micAnalyzer.destroy()
  }

  if (roomObj) {
    roomObj.hangup()
  }

  restoreUI()
}

window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  localStorage.setItem('fabric.callee.' + key, e.target.value)
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
    console.debug('screenShare destroy')
  })

  screenShareObj.once('room.left', () => {
    console.debug('screenShare room.left')
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

window.changeLayout = (select) => {
  console.log('changeLayout', select.value)
  roomObj.setLayout({ name: select.value })
}

window.changeMicrophone = (select) => {
  console.log('changeMicrophone', select.value)
  if (!select.value) {
    return
  }
  roomObj.updateMicrophone({ deviceId: select.value }).then(() => {
    initializeMicAnalyzer(roomObj.localStream)
  })
}

window.changeCamera = (select) => {
  console.log('changeCamera', select.value)
  if (!select.value) {
    return
  }
  roomObj.updateCamera({ deviceId: select.value })
}

window.changeSpeaker = (select) => {
  console.log('changeSpeaker', select.value)
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

function b642ab(base64string) {
  return Uint8Array.from(atob(base64string), (c) => c.charCodeAt(0))
}

async function readPushNotification(payload, pnKey) {
  console.log('payload', payload)

  const key = b642ab(pnKey)
  // console.log('key', key)
  const iv = b642ab(payload.iv)
  // console.log('iv', iv)

  // Chain invite and tag to have the full enc string
  const full = atob(payload.invite) + atob(payload.tag)
  const fullEncrypted = Uint8Array.from(full, (c) => c.charCodeAt(0))
  // console.log('fullEncrypted', fullEncrypted)

  async function decrypt(keyData, iv, data) {
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  }

  const compressed = await decrypt(key, iv, fullEncrypted)
  // console.log('compressed', compressed)

  const result = Pako.inflate(compressed, { to: 'string' }).toString()
  console.log('Dec:\n', JSON.stringify(JSON.parse(result), null, 2))

  return {
    ...payload,
    decrypted: JSON.parse(result),
  }
}

window.enablePushNotifications = async () => {
  //Initialize Firebase App
  const config = {
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FB_APP_ID,
    measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
  }
  console.log('Firebase config', config)

  const app = initializeApp(config)
  const messaging = getMessaging(app)

  onMessage(messaging, (payload) => {
    console.log('Push payload', payload)
    document.getElementById('payload').value = payload.notification.body
    const body = JSON.parse(payload.notification.body || '{}')
    alert(body.title)
  })

  try {
    const firebaseConfig = window.btoa(JSON.stringify(config))
    const registration = await navigator.serviceWorker.register(
      `./sw.js?firebaseConfig=${firebaseConfig}`,
      {
        updateViaCache: 'none',
      }
    )

    console.log(
      'Service Worker registration successful with registration: ',
      registration
    )

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapiKey: import.meta.env.VITE_FB_VAPI_KEY,
      })
      document.getElementById('pn-token').value = token

      const client = await getClient()
      const { push_notification_key } = await client.registerDevice({
        deviceType: 'Android',
        deviceToken: token,
      })
      document.getElementById('pn-key').value = push_notification_key
    }
  } catch (error) {
    console.error('Service Worker registration failed: ', error)
  }
}

/**
 * On document ready auto-fill the input values from the localStorage.
 */
window.ready(async function () {
  document.getElementById('host').value =
    localStorage.getItem('fabric.callee.host') || ''
  document.getElementById('token').value =
    localStorage.getItem('fabric.callee.token') || ''
  document.getElementById('payload').value =
    localStorage.getItem('fabric.callee.payload') || ''
  document.getElementById('audio').checked =
    (localStorage.getItem('fabric.callee.audio') || '1') === '1'
  document.getElementById('video').checked =
    (localStorage.getItem('fabric.callee.video') || '1') === '1'

  await window.enablePushNotifications()
})
