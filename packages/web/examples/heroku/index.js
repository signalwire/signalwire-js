import { createRTCSession } from '../../src'

let rtcSession = null

const muteButtons = [
  muteSelfBtn,
  unmuteSelfBtn,
  // muteAllBtn,
  // unmuteAllBtn,
  // muteVideoAllBtn,
  // unmuteVideoAllBtn,
  muteVideoSelfBtn,
  unmuteVideoSelfBtn,
]

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  createRTCSession({
    host: document.getElementById('host').value,
    token: document.getElementById('token').value,
    rootElementId: 'rootElement',
    audio: true,
    video: true,
  }).then((rtc) => {
    rtcSession = rtc

    console.debug('Video SDK rtcSession', rtcSession)

    rtcSession.on('room.started', (params) =>
      console.debug('>> DEMO room.started', params)
    )
    rtcSession.on('room.subscribed', (params) => {
      console.debug('>> DEMO room.subscribed', params)

      btnConnect.classList.add('d-none')
      btnDisconnect.classList.remove('d-none')
      connectStatus.innerHTML = 'Connected'

      muteButtons.forEach((button) => {
        button.classList.remove('d-none')
        button.disabled = false
      })
    })
    rtcSession.on('room.updated', (params) =>
      console.debug('>> DEMO room.updated', params)
    )
    rtcSession.on('room.ended', (params) => {
      console.debug('>> DEMO room.ended', params)
      hangup()
    })
    rtcSession.on('member.joined', (params) =>
      console.debug('>> DEMO member.joined', params)
    )
    rtcSession.on('member.updated', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    rtcSession.on('member.updated.audio_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )
    rtcSession.on('member.updated.video_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    rtcSession.on('member.left', (params) =>
      console.debug('>> DEMO member.left', params)
    )
    rtcSession.on('layout.changed', (params) =>
      console.debug('>> DEMO layout.changed', params)
    )
    rtcSession.on('track', (event) => console.debug('>> DEMO track', event))

    rtcSession
      .join()
      .then((result) => {
        console.log('>> Room Joined', result)
      })
      .catch((error) => {
        console.error('Join error?', error)
      })
  })

  connectStatus.innerHTML = 'Connecting...'
}

/**
 * Hangup the rtcSession if present
 */
window.hangup = () => {
  if (rtcSession) {
    rtcSession.hangup()
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

window.muteAll = () => {
  rtcSession.audioMute('all')
}

window.unmuteAll = () => {
  rtcSession.audioUnmute('all')
}

window.muteSelf = () => {
  rtcSession.audioMute(rtcSession.memberId)
}

window.unmuteSelf = () => {
  rtcSession.audioUnmute(rtcSession.memberId)
}

window.muteVideoAll = () => {
  rtcSession.videoMute('all')
}

window.unmuteVideoAll = () => {
  rtcSession.videoUnmute('all')
}

window.muteVideoSelf = () => {
  rtcSession.videoMute(rtcSession.memberId)
}

window.unmuteVideoSelf = () => {
  rtcSession.videoUnmute(rtcSession.memberId)
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
