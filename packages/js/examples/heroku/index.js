import { Video } from '@signalwire/js'
import {
  enumerateDevices,
  getMicrophoneDevices,
  getCameraDevices,
  getSpeakerDevices,
  supportsMediaOutput,
  createDeviceWatcher,
} from '@signalwire/webrtc'

let roomObj = null

const inCallElements = [
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
]

async function loadLayouts(currentLayoutId) {
  try {
    const { layouts } = await roomObj.getLayoutList()
    const layoutEl = document.getElementById('layout')
    layoutEl.innerHTML = ''

    const defOption = document.createElement('option')
    defOption.value = ''
    defOption.innerHTML = 'Change layout..'
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
  } catch (error) {
    console.warn('Error listing layout', error)
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

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  Video.createRoomObject({
    host: document.getElementById('host').value,
    token: document.getElementById('token').value,
    rootElementId: 'rootElement',
    audio: true,
    video: true,
  }).then((roomObject) => {
    roomObj = roomObject
    window._roomObj = roomObject

    console.debug('Video SDK roomObj', roomObj)

    roomObj.on('room.started', (params) =>
      console.debug('>> room.started', params)
    )
    roomObj.on('room.joined', (params) => {
      console.debug('>> room.joined', params)

      btnConnect.classList.add('d-none')
      btnDisconnect.classList.remove('d-none')
      connectStatus.innerHTML = 'Connected'

      inCallElements.forEach((button) => {
        button.classList.remove('d-none')
        button.disabled = false
      })

      loadLayouts()
    })
    roomObj.on('room.updated', (params) =>
      console.debug('>> room.updated', params)
    )
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

    roomObj.on('member.updated.audio_muted', (params) =>
      console.debug('>> member.updated.audio_muted', params)
    )
    roomObj.on('member.updated.video_muted', (params) =>
      console.debug('>> member.updated.video_muted', params)
    )

    roomObj.on('member.left', (params) =>
      console.debug('>> member.left', params)
    )
    roomObj.on('member.talking', (params) =>
      console.debug('>> member.talking', params)
    )
    roomObj.on('layout.changed', (params) =>
      console.debug('>> layout.changed', params)
    )
    roomObj.on('track', (event) => console.debug('>> DEMO track', event))

    roomObj
      .join()
      .then((result) => {
        console.log('>> Room Joined', result)

        enumerateDevices()
          .then(initDeviceOptions)
          .catch((error) => {
            console.error(error)
          })

        createDeviceWatcher().then((deviceWatcher) => {
          deviceWatcher.on('changed', () => {
            initDeviceOptions()
          })
        })
      })
      .catch((error) => {
        console.error('Join error?', error)
      })
  })

  connectStatus.innerHTML = 'Connecting...'
}

/**
 * Hangup the roomObj if present
 */
window.hangup = () => {
  if (roomObj) {
    roomObj.hangup()
  }

  btnConnect.classList.remove('d-none')
  btnDisconnect.classList.add('d-none')
  connectStatus.innerHTML = 'Not Connected'

  inCallElements.forEach((button) => {
    button.classList.add('d-none')
    button.disabled = true
  })
}

window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  localStorage.setItem('relay.example.' + key, e.target.value)
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
  screenShareObj = await roomObj.createScreenShareObject({
    audio: true,
    video: true,
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
  roomObj.updateMicrophone({ deviceId: select.value })
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
  }
}

/**
 * On document ready auto-fill the input values from the localStorage.
 */
window.ready(function () {
  document.getElementById('host').value =
    localStorage.getItem('relay.example.host') || ''
  document.getElementById('token').value =
    localStorage.getItem('relay.example.token') || ''
  document.getElementById('audio').checked =
    (localStorage.getItem('relay.example.audio') || '1') === '1'
  document.getElementById('video').checked =
    (localStorage.getItem('relay.example.video') || '1') === '1'
})
