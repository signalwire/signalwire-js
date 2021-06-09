import { Video } from '../../src'

let roomObj = null

const inCallElements = [
  muteSelfBtn,
  unmuteSelfBtn,
  muteVideoSelfBtn,
  unmuteVideoSelfBtn,
  deafSelfBtn,
  undeafSelfBtn,
  controlSliders,
  hideVMutedBtn,
  showVMutedBtn,
]

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  const sfuWrapper = document.getElementById('sfuWrapper')
  const canvasMap = new Map()
  let _allowCanvasDraw = true

  const _deleteCanvas = (memberId) => {
    // destroy canvas and context2d
    let { canvasEl, canvasCtx } = canvasMap.get(memberId)
    canvasCtx = undefined
    canvasEl.parentNode.removeChild(canvasEl)
    canvasMap.delete(memberId)
  }
  const _stopDrawingCanvas = function () {
    _allowCanvasDraw = false
    for (const memberId of canvasMap.keys()) {
      _deleteCanvas(memberId)
    }
  }
  const _startDrawingCanvas = function () {
    const _mcu = document.querySelector('#rootElement video')
    console.debug('_mcu', _mcu)
    function updateCanvas() {
      canvasMap.forEach((mapValue) => {
        const { canvasEl, canvasCtx, x, y, width, height } = mapValue
        canvasEl.width = width
        canvasEl.height = height
        canvasCtx.drawImage(_mcu, x, y, width, height, 0, 0, width, height)
        canvasCtx.restore()
      })
      if (_allowCanvasDraw) {
        setTimeout(function () {
          requestAnimationFrame(updateCanvas)
        }, 1000 / 15)
      }
    }
    updateCanvas()
  }

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
      console.debug('>> DEMO room.started', params)
    )
    roomObj.on('room.joined', (params) => {
      console.debug('>> DEMO room.joined', params)

      btnConnect.classList.add('d-none')
      btnDisconnect.classList.remove('d-none')
      connectStatus.innerHTML = 'Connected'

      inCallElements.forEach((button) => {
        button.classList.remove('d-none')
        button.disabled = false
      })

      // Start watching canvas
      _startDrawingCanvas()
    })
    roomObj.on('room.updated', (params) =>
      console.debug('>> DEMO room.updated', params)
    )
    roomObj.on('room.ended', (params) => {
      console.debug('>> DEMO room.ended', params)
      hangup()
    })
    roomObj.on('member.joined', (params) =>
      console.debug('>> DEMO member.joined', params)
    )
    roomObj.on('member.updated', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    roomObj.on('member.updated.audio_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )
    roomObj.on('member.updated.video_muted', (params) =>
      console.debug('>> DEMO member.updated', params)
    )

    roomObj.on('member.left', (params) =>
      console.debug('>> DEMO member.left', params)
    )

    roomObj.on('layout.changed', (params) => {
      console.debug('>> DEMO layout.changed', params)
      const { layout } = params

      const validMemberIds = []
      layout.layers.forEach(({ memberID, x, y, width, height }) => {
        if (memberID) {
          validMemberIds.push(memberID)
          if (!canvasMap.has(memberID)) {
            // build canvas and context2d
            const canvasEl = document.createElement('canvas')
            canvasEl.id = 'canvas_' + memberID
            canvasEl.style.maxWidth = '25%'
            sfuWrapper.appendChild(canvasEl)
            const canvasCtx = canvasEl.getContext('2d', { alpha: false })
            canvasMap.set(memberID, {
              memberID,
              canvasEl,
              canvasCtx,
              x,
              y,
              width,
              height,
            })
          } else {
            canvasMap.set(memberID, {
              ...canvasMap.get(memberID),
              x,
              y,
              width,
              height,
            })
          }
        }
      })

      Array.from(canvasMap.keys()).forEach((memberID) => {
        if (!validMemberIds.includes(memberID)) {
          _deleteCanvas(memberID)
        }
      })
    })
    roomObj.on('track', (event) => console.debug('>> DEMO track', event))
    roomObj.on('destroy', () => {
      _stopDrawingCanvas()
    })

    roomObj
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

window.muteAll = () => {
  roomObj.audioMute('all')
}

window.unmuteAll = () => {
  roomObj.audioUnmute('all')
}

window.muteSelf = () => {
  roomObj.audioMute(roomObj.memberId)
}

window.unmuteSelf = () => {
  roomObj.audioUnmute(roomObj.memberId)
}

window.muteVideoAll = () => {
  roomObj.videoMute('all')
}

window.unmuteVideoAll = () => {
  roomObj.videoUnmute('all')
}

window.muteVideoSelf = () => {
  roomObj.videoMute(roomObj.memberId)
}

window.unmuteVideoSelf = () => {
  roomObj.videoUnmute(roomObj.memberId)
}

window.deafSelf = () => {
  roomObj.deaf(roomObj.memberId)
}

window.undeafSelf = () => {
  roomObj.undeaf(roomObj.memberId)
}

window.hideVideoMuted = () => {
  roomObj.hideVideoMuted()
}

window.showVideoMuted = () => {
  roomObj.showVideoMuted()
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
