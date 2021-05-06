import { createRoom } from '../../src'

var client
var currentCall = null

var host = localStorage.getItem('relay.example.host') || ''
var project = localStorage.getItem('relay.example.project') || ''
var token = localStorage.getItem('relay.example.token') || ''
var number = localStorage.getItem('relay.example.number') || ''
var audio = localStorage.getItem('relay.example.audio') || '1'
var video = localStorage.getItem('relay.example.video') || '1'

const muteButtons = [
  muteSelfBtn,
  unmuteSelfBtn,
  muteAllBtn,
  unmuteAllBtn,
  muteVideoAllBtn,
  unmuteVideoAllBtn,
  muteVideoSelfBtn,
  unmuteVideoSelfBtn,
]

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  createRoom({
    host: document.getElementById('host').value,
    token: document.getElementById('token').value,
    rootElementId: 'rootElement',
    audio: true,
    video: true,
  }).then((room) => {
    currentCall = room

    console.debug('Video SDK room', room)

    room.on('room.started', (params) =>
      console.debug('>> DEMO room.started', params)
    )
    room.on('room.subscribed', (params) => {
      console.debug('>> DEMO room.subscribed', params)

      btnConnect.classList.add('d-none')
      btnDisconnect.classList.remove('d-none')
      connectStatus.innerHTML = 'Connected'

      muteButtons.forEach((button) => {
        button.classList.remove('d-none')
        button.disabled = false
      })
    })
    room.on('room.updated', (params) =>
      console.debug('>> DEMO room.updated', params)
    )
    room.on('room.ended', (params) => {
      console.debug('>> DEMO room.ended', params)
      hangup()
    })
    room.on('member.joined', (params) =>
      console.debug('>> DEMO member.joined', params)
    )
    room.on('member.updated', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    room.on('member.updated.audio_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )
    room.on('member.updated.video_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    room.on('member.left', (params) =>
      console.debug('>> DEMO member.left', params)
    )
    room.on('layout.changed', (params) =>
      console.debug('>> DEMO layout.changed', params)
    )
    room.on('track', (event) => console.debug('>> DEMO track', event))

    room.join()
  })

  connectStatus.innerHTML = 'Connecting...'
}

/**
 * Hangup the currentCall if present
 */
window.hangup = () => {
  if (currentCall) {
    currentCall.hangup()
  }

  btnConnect.classList.remove('d-none')
  btnDisconnect.classList.add('d-none')
  connectStatus.innerHTML = 'Not Connected'

  muteButtons.forEach((button) => {
    button.classList.add('d-none')
    button.disabled = true
  })
}

window.saveInLocalStorage = (e) => {
  var key = e.target.name || e.target.id
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

window.muteAll = () => {
  currentCall.audioMute('all')
}

window.unmuteAll = () => {
  currentCall.audioUnmute('all')
}

window.muteSelf = () => {
  currentCall.audioMute(currentCall.memberId)
}

window.unmuteSelf = () => {
  currentCall.audioUnmute(currentCall.memberId)
}

window.muteVideoAll = () => {
  currentCall.videoMute('all')
}

window.unmuteVideoAll = () => {
  currentCall.videoUnmute('all')
}

window.muteVideoSelf = () => {
  currentCall.videoMute(currentCall.memberId)
}

window.unmuteVideoSelf = () => {
  currentCall.videoUnmute(currentCall.memberId)
}

/**
 * On document ready auto-fill the input values from the localStorage.
 */
window.ready(function () {
  document.getElementById('host').value = host
  document.getElementById('project').value = project
  document.getElementById('token').value = token
  document.getElementById('audio').checked = audio === '1'
  document.getElementById('video').checked = video === '1'
})
