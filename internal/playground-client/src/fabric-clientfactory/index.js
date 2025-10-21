import {
  SignalWire,
  buildVideoElement,
  ClientFactory,
  LocalStorageAdapter,
} from '@signalwire/client'
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

// ClientFactory global variables
let clientFactory = null
let profiles = new Map() // Map<profileId, profile>
let activeClients = new Map() // Map<profileId, client instance>
let selectedProfileId = null
let activeCalls = new Map() // Map<profileId, call instance>
let callStartTime = null

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
  endSelfBtn,
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

// ClientFactory Profile Management Functions

/**
 * Initialize the ClientFactory with LocalStorageAdapter
 */
async function initializeClientFactory() {
  if (clientFactory) return clientFactory

  clientFactory = ClientFactory.getInstance()
  const storage = new LocalStorageAdapter()

  await clientFactory.init(storage)

  // Load existing profiles
  await loadExistingProfiles()

  return clientFactory
}

/**
 * Load existing profiles from storage and update UI
 */
async function loadExistingProfiles() {
  try {
    const existingProfiles = await clientFactory.listProfiles()
    profiles.clear()

    for (const profile of existingProfiles) {
      profiles.set(profile.id, profile)
    }

    updateProfilesUI()
    updateProfileSelector()
  } catch (error) {
    console.error('Failed to load existing profiles:', error)
    showError('Failed to load existing profiles: ' + error.message)
  }
}

/**
 * Parse JSON credentials and add profiles
 */
window.addProfile = async () => {
  try {
    if (!clientFactory) {
      await initializeClientFactory()
    }

    const credentialsInput = document.getElementById('credentialsInput')
    const credentialsText = credentialsInput.value.trim()
    if (!credentialsText) {
      showError('Please enter JSON credentials')
      return
    }

    let credentialsData
    try {
      credentialsData = JSON.parse(credentialsText)
    } catch (parseError) {
      showError('Invalid JSON format. Please check your credentials.')
      return
    }

    // Validate required fields
    if (!credentialsData.satToken) {
      showError('Credentials must include "satToken" field')
      return
    }



    // Create credentials object
    const credentials = {
      satToken: credentialsData.satToken,
      satRefreshPayload: credentialsData.satRefreshPayload || {},
      satRefreshURL:
        credentialsData.satRefreshUrl || credentialsData.satRefreshURL,
      satRefreshResultMapper: credentialsData.satRefreshResultMapper,
      tokenExpiry: credentialsData.tokenExpiry || Date.now() + 3600000, // 1 hour default
    }

    // Add host if provided (helps with API calls)
    if (credentialsData.host) {
      credentials.host = credentialsData.host
    }

    // Create profile data
    const profileData = {
      type: 'static', // Always static for persisted profiles
      credentialsId: credentialsData.credentialsId || `creds_${Date.now()}`,
      credentials: credentials,
    }

    // Add profiles using ClientFactory
    console.log('Adding profile with data:', profileData)
    const addedProfiles = await clientFactory.addProfiles({
      profiles: [profileData],
    })

    console.log('Added profiles result:', addedProfiles)

    if (addedProfiles.length === 0) {
      // Check if we need to provide addressId manually
      console.error('No profiles were created. This usually means:')
      console.error('1. The token is invalid or expired')
      console.error('2. The subscriber has no fabric addresses')
      console.error('3. Network/CORS issues preventing API calls')
      console.error('Check the browser console for warnings from ClientFactory')
      throw new Error('No profiles were created. Check console for details.')
    }

    // Update local profiles map
    for (const profile of addedProfiles) {
      profiles.set(profile.id, profile)
    }

    // Update UI
    updateProfilesUI()
    updateProfileSelector()

    // Clear input
    credentialsInput.value = ''

    showSuccess(`Successfully added ${addedProfiles.length} profile(s)`)
  } catch (error) {
    console.error('Failed to add profile:', error)
    showError('Failed to add profile: ' + error.message)
  }
}

/**
 * Clear all profiles
 */
window.clearAllProfiles = async () => {
  if (
    !confirm(
      'Are you sure you want to clear all profiles? This will also dispose all active clients.'
    )
  ) {
    return
  }

  try {
    if (!clientFactory) {
      await initializeClientFactory()
    }

    // Hangup all active calls first
    for (const [profileId, call] of activeCalls) {
      try {
        await call.hangup?.()
      } catch (error) {
        console.warn(`Failed to hangup call for profile ${profileId}:`, error)
      }
    }
    activeCalls.clear()

    // Dispose all active clients
    for (const [profileId, client] of activeClients) {
      try {
        await client.disconnect?.()
      } catch (error) {
        console.warn(
          `Failed to disconnect client for profile ${profileId}:`,
          error
        )
      }
    }
    activeClients.clear()

    // Remove all profiles
    const profileIds = Array.from(profiles.keys())
    if (profileIds.length > 0) {
      await clientFactory.removeProfiles({ profileIds })
    }

    // Clear local state
    profiles.clear()
    selectedProfileId = null

    // Update UI
    updateProfilesUI()
    updateProfileSelector()

    showSuccess('All profiles cleared successfully')
  } catch (error) {
    console.error('Failed to clear profiles:', error)
    showError('Failed to clear profiles: ' + error.message)
  }
}

/**
 * Select a profile and update UI state
 */
window.selectProfile = () => {
  const previousProfileId = selectedProfileId
  const profileSelector = document.getElementById('profileSelector')
  selectedProfileId = profileSelector.value || null

  // Update connect button state
  updateConnectButtonState()
}

// Profile management utility functions
function updateProfilesUI() {
  const profilesList = document.getElementById('profilesList')

  if (!profilesList) return // Gracefully handle missing element

  if (profiles.size === 0) {
    profilesList.innerHTML = `
      <li class="list-group-item text-muted text-center py-3">
        <i class="bi bi-person-x fs-4 d-block mb-2"></i>
        No profiles added yet
      </li>
    `
    return
  }

  profilesList.innerHTML = ''

  for (const [profileId, profile] of profiles) {
    const listItem = document.createElement('li')
    listItem.className = 'list-group-item'
    listItem.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-1">
            <span class="badge bg-primary me-2">${profile.type}</span>
            <strong class="text-truncate">${escapeHTML(
              profile.addressDetails?.displayName || profile.addressId
            )}</strong>
          </div>
          <div class="text-muted small">
            <div>Address: ${escapeHTML(profile.addressId)}</div>
            <div>Type: ${escapeHTML(
              profile.addressDetails?.type || 'unknown'
            )}</div>
            ${
              profile.lastUsed
                ? `<div>Last used: ${formatDate(profile.lastUsed)}</div>`
                : ''
            }
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${
            activeClients.has(profileId)
              ? '<i class="bi bi-circle-fill text-success" title="Active client"></i>'
              : '<i class="bi bi-circle text-muted" title="No active client"></i>'
          }
          <button 
            class="btn btn-outline-danger btn-sm" 
            onclick="removeProfile('${profileId}')"
            title="Remove profile"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `

    profilesList.appendChild(listItem)
  }
}

function updateProfileSelector() {
  const profileSelector = document.getElementById('profileSelector')

  if (!profileSelector) return // Gracefully handle missing element

  profileSelector.innerHTML = '<option value="">Select a profile</option>'

  for (const [profileId, profile] of profiles) {
    const option = document.createElement('option')
    option.value = profileId
    option.textContent = `${
      profile.addressDetails?.displayName || profile.addressId
    } (${profile.addressDetails?.type || 'unknown'})`
    profileSelector.appendChild(option)
  }

  // Enable/disable selector
  profileSelector.disabled = profiles.size === 0

  // Update connect button - enable if profile is selected OR if host/token are filled for direct connection
  updateConnectButtonState()
}

function updateConnectButtonState() {
  const connectBtn = document.getElementById('btnConnect')
  if (!connectBtn) return

  const hostEl = document.getElementById('host')
  const tokenEl = document.getElementById('token')

  // Enable if profile is selected OR if host and token are filled for direct connection
  const hasProfile = selectedProfileId && profiles.size > 0
  const hasDirectConnection = hostEl?.value?.trim() && tokenEl?.value?.trim()

  connectBtn.disabled = !(hasProfile || hasDirectConnection)
}

// Utility functions for UI
function showError(message) {
  console.error(message)
  // You can implement a toast notification here
  alert('Error: ' + message)
}

function showSuccess(message) {
  console.log(message)
  // You can implement a toast notification here
  alert('Success: ' + message)
}

function escapeHTML(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString()
}

/**
 * Remove a specific profile
 */
window.removeProfile = async (profileId) => {
  if (!confirm('Are you sure you want to remove this profile?')) {
    return
  }

  try {
    if (!clientFactory) {
      await initializeClientFactory()
    }

    // Hangup active call if exists
    if (activeCalls.has(profileId)) {
      try {
        const call = activeCalls.get(profileId)
        await call.hangup?.()
        activeCalls.delete(profileId)
      } catch (error) {
        console.warn(`Failed to hangup call for profile ${profileId}:`, error)
      }
    }

    // Dispose active client if exists
    if (activeClients.has(profileId)) {
      try {
        const client = activeClients.get(profileId)
        await client.disconnect?.()
        activeClients.delete(profileId)
      } catch (error) {
        console.warn(
          `Failed to disconnect client for profile ${profileId}:`,
          error
        )
      }
    }

    // Remove from ClientFactory
    await clientFactory.removeProfiles({ profileIds: [profileId] })

    // Remove from local state
    profiles.delete(profileId)

    // If this was the selected profile, clear selection
    if (selectedProfileId === profileId) {
      selectedProfileId = null
      const profileSelector = document.getElementById('profileSelector')
      if (profileSelector) profileSelector.value = ''
    }

    // Update UI
    updateProfilesUI()
    updateProfileSelector()

    showSuccess('Profile removed successfully')
  } catch (error) {
    console.error('Failed to remove profile:', error)
    showError('Failed to remove profile: ' + error.message)
  }
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
 * Supports both ClientFactory profiles and direct connection.
 */
window.connect = async () => {
  const connectStatus = document.getElementById('connectStatus')
  const btnConnect = document.getElementById('btnConnect')
  const btnDial = document.getElementById('btnDial')
  const btnDisconnect = document.getElementById('btnDisconnect')

  if (connectStatus) connectStatus.innerHTML = 'Connecting...'

  try {
    // Check if we should use ClientFactory (when a profile is selected)
    if (selectedProfileId) {
      console.log('Connecting using ClientFactory profile:', selectedProfileId)

      if (!clientFactory) {
        await initializeClientFactory()
      }

      // Get or create client for the selected profile
      const { instance: clientInstance, isNew } = await clientFactory.getClient(
        {
          profileId: selectedProfileId,
          options: {
            logLevel: 'debug',
            debug: { logWsTraffic: true },
          },
        }
      )

      // Store the client instance
      activeClients.set(selectedProfileId, clientInstance.client)
      client = clientInstance.client

      if (isNew) {
        console.log(
          'Created new client instance for profile:',
          selectedProfileId
        )
      } else {
        console.log(
          'Using existing client instance for profile:',
          selectedProfileId
        )
      }

      // Store client globally for other functions
      window.__client = client

      showSuccess('Connected successfully using ClientFactory!')
    } else {
      // Use direct connection (legacy mode)
      console.log('Connecting using direct SignalWire client')

      const hostEl = document.getElementById('host')
      const tokenEl = document.getElementById('token')

      if (!hostEl?.value || !tokenEl?.value) {
        throw new Error('Host and Token are required for direct connection')
      }

      client = await SignalWire({
        host: hostEl.value,
        token: tokenEl.value,
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
    }

    if (connectStatus) connectStatus.innerHTML = 'Connected'

    if (btnConnect) btnConnect.classList.add('d-none')
    if (btnDial) btnDial.classList.remove('d-none')
    if (btnDisconnect) btnDisconnect.classList.remove('d-none')

    removeRoomFromURL()
  } catch (error) {
    console.error('Failed to connect:', error)
    if (connectStatus) connectStatus.innerHTML = 'Connection Failed'
    showError('Failed to connect: ' + error.message)

    // Reset button states on error
    if (btnConnect) btnConnect.classList.remove('d-none')
    if (btnDial) btnDial.classList.add('d-none')
    if (btnDisconnect) btnDisconnect.classList.add('d-none')
  }
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
    fromFabricAddressId: document.getElementById('fromFabricAddressId').value,
    video: document.getElementById('video').checked,
    audio: document.getElementById('audio').checked,
  })

  window.__call = call
  roomObj = call

  roomObj.on('call.state', (params) => {
    console.debug('>> call.state', params)
  })
  roomObj.on('call.joined', (params) => {
    console.debug('>> call.joined', params)

    const selfMember = params.room_session.members.find(
      (member) => member.member_id === params.member_id
    )
    if (selfMember) {
      microphoneVolume.value = selfMember.input_volume
      speakerVolume.value = selfMember.output_volume
      inputSensitivity.value = selfMember.input_sensitivity
    }
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
  roomObj.on('member.updated.deaf', (params) =>
    console.debug('>> member.updated.deaf', params)
  )
  roomObj.on('member.updated.visible', (params) =>
    console.debug('>> member.updated.visible', params)
  )
  roomObj.on('member.updated.inputVolume', (params) =>
    console.debug('>> member.updated.inputVolume', params)
  )
  roomObj.on('member.updated.outputVolume', (params) =>
    console.debug('>> member.updated.outputVolume', params)
  )
  roomObj.on('member.updated.inputSensitivity', (params) =>
    console.debug('>> member.updated.inputSensitivity', params)
  )
  roomObj.on('member.updated.handraised', (params) =>
    console.debug('>> member.updated.handraised', params)
  )
  roomObj.on('member.updated.echoCancellation', (params) =>
    console.debug('>> member.updated.echoCancellation', params)
  )
  roomObj.on('member.updated.autoGain', (params) =>
    console.debug('>> member.updated.autoGain', params)
  )
  roomObj.on('member.updated.noiseSuppression', (params) =>
    console.debug('>> member.updated.noiseSuppression', params)
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

  roomObj.on('microphone.updated', (params) => {
    console.debug('>> microphone.updated', params)
  })
  roomObj.on('camera.updated', (params) => {
    console.debug('>> camera.updated', params)
  })
  roomObj.on('speaker.updated', (params) => {
    console.debug('>> speaker.updated', params)
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

  // Save to localStorage with appropriate prefix
  const prefix =
    key === 'credentialsInput' ? 'fabric.clientfactory.' : 'fabric.ws.'
  localStorage.setItem(prefix + key, value)

  // Update connect button state when host or token fields change
  if (key === 'host' || key === 'token') {
    updateConnectButtonState()
  }
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
  // roomObj.lock()
  roomObj.setAudioFlags({
    echoCancellation: false,
    autoGain: false,
    noiseSuppression: false,
  })
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
      roomObj.setInputVolume({ volume: range.value })
      break
    case 'speakerVolume':
      roomObj.setOutputVolume({ volume: range.value })
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
  // Legacy input fields
  const hostEl = document.getElementById('host')
  const tokenEl = document.getElementById('token')
  const destinationEl = document.getElementById('destination')
  const fromFabricAddressIdEl = document.getElementById('fromFabricAddressId')
  const audioEl = document.getElementById('audio')
  const videoEl = document.getElementById('video')

  if (hostEl) hostEl.value = localStorage.getItem('fabric.ws.host') || ''
  if (tokenEl) tokenEl.value = localStorage.getItem('fabric.ws.token') || ''
  if (destinationEl)
    destinationEl.value = localStorage.getItem('fabric.ws.destination') || ''
  if (fromFabricAddressIdEl)
    fromFabricAddressIdEl.value =
      localStorage.getItem('fabric.ws.fromFabricAddressId') || ''
  if (audioEl) audioEl.checked = true
  if (videoEl)
    videoEl.checked = localStorage.getItem('fabric.ws.video') === 'true'

  // ClientFactory input fields
  const credentialsInput = document.getElementById('credentialsInput')
  if (credentialsInput) {
    credentialsInput.value =
      localStorage.getItem('fabric.clientfactory.credentialsInput') || ''
  }

  // Initialize ClientFactory and load existing profiles
  await initializeClientFactory()

  const urlParams = new URLSearchParams(window.location.search)
  const room = urlParams.get('room')
  if (room) {
    await connect()
    await dial({ reattach: true })
  } else {
    console.log('Room parameter not found')
  }
})

window.endSelf = async () => {
  try {
    if (!roomObj) throw new Error('No active room session')
    console.log('Attempting to end call for self')
    await roomObj.end()
    console.log('Call ended for self')
  } catch (error) {
    console.error('Failed to end call:', error)
  }
}
