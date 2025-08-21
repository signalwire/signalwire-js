import { ClientFactory, LocalStorageAdapter } from '@signalwire/client'

// Global variables
let clientFactory = null
let profiles = new Map() // Map<profileId, profile>
let activeClients = new Map() // Map<profileId, client instance>
let selectedProfileId = null
let activeCalls = new Map() // Map<profileId, call instance>
let callStartTime = null

// UI References
const searchInput = document.getElementById('searchInput')
const searchType = document.getElementById('searchType')
const conversationMessageInput = document.getElementById('new-conversation-message')
const sendMessageBtn = document.getElementById('send-message')
const credentialsInput = document.getElementById('credentialsInput')
const profileSelector = document.getElementById('profileSelector')

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
    if (!credentialsData.host || !credentialsData.token) {
      showError('Credentials must include "host" and "token" fields')
      return
    }

    // Handle satRefreshResultMapper as string (eval to function)
    if (credentialsData.satRefreshResultMapper && typeof credentialsData.satRefreshResultMapper === 'string') {
      try {
        credentialsData.satRefreshResultMapper = eval(`(${credentialsData.satRefreshResultMapper})`)
      } catch (evalError) {
        console.warn('Failed to eval satRefreshResultMapper, using default mapper:', evalError)
        credentialsData.satRefreshResultMapper = (body) => ({
          satToken: body.satToken || body.token,
          tokenExpiry: body.tokenExpiry || body.expires_at || (Date.now() + 3600000),
          satRefreshPayload: body.satRefreshPayload || {}
        })
      }
    }

    // Create credentials object
    const credentials = {
      satToken: credentialsData.token,
      satRefreshPayload: credentialsData.satRefreshPayload || {},
      satRefreshURL: credentialsData.satRefreshURL || `https://${credentialsData.host}/api/fabric/auth/refresh`,
      satRefreshResultMapper: credentialsData.satRefreshResultMapper || ((body) => ({
        satToken: body.satToken || body.token,
        tokenExpiry: body.tokenExpiry || body.expires_at || (Date.now() + 3600000),
        satRefreshPayload: body.satRefreshPayload || {}
      })),
      tokenExpiry: credentialsData.tokenExpiry || (Date.now() + 3600000) // 1 hour default
    }

    // Create profile data
    const profileData = {
      type: 'static', // Always static for persisted profiles
      credentialsId: credentialsData.credentialsId || `creds_${Date.now()}`,
      credentials: credentials,
    }

    // If addressId is provided, use it directly (backward compatibility)
    if (credentialsData.addressId) {
      profileData.addressId = credentialsData.addressId
      profileData.addressDetails = {
        type: credentialsData.type || 'subscriber',
        name: credentialsData.name || credentialsData.displayName || 'Unknown',
        displayName: credentialsData.displayName || credentialsData.name || 'Unknown',
        channels: credentialsData.channels || 1
      }
    }

    // Add profiles using ClientFactory
    const addedProfiles = await clientFactory.addProfiles({
      profiles: [profileData]
    })

    if (addedProfiles.length === 0) {
      throw new Error('No profiles were created')
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
  if (!confirm('Are you sure you want to clear all profiles? This will also dispose all active clients.')) {
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
        console.warn(`Failed to disconnect client for profile ${profileId}:`, error)
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
    clearAddressesUI()
    clearHistoryUI()
    
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
  selectedProfileId = profileSelector.value || null
  
  // Hide call status when switching profiles
  if (previousProfileId !== selectedProfileId) {
    hideCallStatus()
  }
  
  // Update connect button state
  const connectBtn = document.getElementById('btnConnect')
  connectBtn.disabled = !selectedProfileId
  
  // Clear addresses and history when switching profiles
  clearAddressesUI()
  clearHistoryUI()
}

/**
 * Connect with selected profile and load addresses
 */
window.connect = async () => {
  if (!selectedProfileId) {
    showError('Please select a profile first')
    return
  }

  try {
    if (!clientFactory) {
      await initializeClientFactory()
    }

    // Get or create client for the selected profile
    const { instance: clientInstance, isNew } = await clientFactory.getClient({
      profileId: selectedProfileId
    })

    // Store the client instance
    activeClients.set(selectedProfileId, clientInstance.client)
    
    if (isNew) {
      console.log('Created new client instance for profile:', selectedProfileId)
    } else {
      console.log('Using existing client instance for profile:', selectedProfileId)
    }

    // Store client globally for other functions
    window.__client = clientInstance.client

    // Load addresses and history
    await Promise.all([fetchHistories(), fetchAddresses()])

    // Get subscriber info
    const subscriber = await clientInstance.client.getSubscriberInfo()
    console.log('>> subscriber', subscriber)

    showSuccess('Connected successfully!')

  } catch (error) {
    console.error('Failed to connect:', error)
    showError('Failed to connect: ' + error.message)
  }
}

/**
 * Get the active client for the selected profile
 */
function getActiveClient() {
  if (!selectedProfileId || !activeClients.has(selectedProfileId)) {
    return null
  }
  return activeClients.get(selectedProfileId)
}

/**
 * Update profiles list UI
 */
function updateProfilesUI() {
  const profilesList = document.getElementById('profilesList')
  
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
            <strong class="text-truncate">${escapeHTML(profile.addressDetails?.displayName || profile.addressId)}</strong>
          </div>
          <div class="text-muted small">
            <div>Address: ${escapeHTML(profile.addressId)}</div>
            <div>Type: ${escapeHTML(profile.addressDetails?.type || 'unknown')}</div>
            ${profile.lastUsed ? `<div>Last used: ${formatDate(profile.lastUsed)}</div>` : ''}
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${activeClients.has(profileId) ? '<i class="bi bi-circle-fill text-success" title="Active client"></i>' : '<i class="bi bi-circle text-muted" title="No active client"></i>'}
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

/**
 * Update profile selector dropdown
 */
function updateProfileSelector() {
  profileSelector.innerHTML = '<option value="">Select a profile</option>'
  
  for (const [profileId, profile] of profiles) {
    const option = document.createElement('option')
    option.value = profileId
    option.textContent = `${profile.addressDetails?.displayName || profile.addressId} (${profile.addressDetails?.type || 'unknown'})`
    profileSelector.appendChild(option)
  }
  
  // Enable/disable selector
  profileSelector.disabled = profiles.size === 0
  
  // Update connect button
  const connectBtn = document.getElementById('btnConnect')
  connectBtn.disabled = !selectedProfileId || profiles.size === 0
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
        console.warn(`Failed to disconnect client for profile ${profileId}:`, error)
      }
    }

    // Remove from ClientFactory
    await clientFactory.removeProfiles({ profileIds: [profileId] })
    
    // Remove from local state
    profiles.delete(profileId)
    
    // If this was the selected profile, clear selection
    if (selectedProfileId === profileId) {
      selectedProfileId = null
      profileSelector.value = ''
      clearAddressesUI()
      clearHistoryUI()
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

// Save in localStorage functionality
window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  localStorage.setItem('fabric.clientfactory.' + key, e.target.value)
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

// Device registration functions
window.registerDeviceSNS = () => {
  const client = getActiveClient()
  if (!client) {
    showError('No active client. Please connect first.')
    return
  }
  return client.registerDevice({
    deviceType: 'iOS',
    deviceToken: 'foo',
  })
}

window.unregisterDeviceSNS = () => {
  const client = getActiveClient()
  if (!client) {
    showError('No active client. Please connect first.')
    return
  }
  return client.unregisterDevice({
    id: '<UUID>',
  })
}

/**
 * Auto-fill input values from localStorage on page load
 */
window.ready(async function () {
  credentialsInput.value = localStorage.getItem('fabric.clientfactory.credentialsInput') || ''
  
  // Initialize ClientFactory and load existing profiles
  await initializeClientFactory()
})

// Utility functions
const escapeHTML = (str) => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const showError = (message) => {
  // You can replace this with a proper toast/notification system
  console.error(message)
  alert('Error: ' + message)
}

const showSuccess = (message) => {
  // You can replace this with a proper toast/notification system
  console.log(message)
  // For now, we'll skip success alerts to avoid spam
}

// Clear UI functions
function clearAddressesUI() {
  const addressesList = document.getElementById('addressesList')
  const addressesPlaceholder = document.getElementById('addressesPlaceholder')
  const addressPagination = document.getElementById('addressPagination')
  
  addressesList?.classList.add('d-none')
  addressesPlaceholder?.classList.remove('d-none')
  addressPagination?.style.setProperty('display', 'none', 'important')
  
  if (addressesList) {
    addressesList.innerHTML = ''
  }
}

function clearHistoryUI() {
  const historiesList = document.getElementById('historiesList')
  const historyPlaceholder = document.getElementById('historyPlaceholder')
  
  historiesList?.classList.add('d-none')
  historyPlaceholder?.classList.remove('d-none')
  
  if (historiesList) {
    historiesList.innerHTML = ''
  }
}

/** ======= Tab utilities start ======= */
window.toggleTabState = async (activeButtonName) => {
  const config = [
    {
      name: 'Directory',
      button: document.querySelector('button[name="Directory"]'),
      card: document.getElementById('addressCard'),
    },
    {
      name: 'History',
      button: document.querySelector('button[name="History"]'),
      card: document.getElementById('historyCard'),
    },
  ]

  config.forEach(({ name, button, card }) => {
    if (name === activeButtonName) {
      button.classList.add('active', 'text-black')
      button.classList.remove('text-secondary')
      card.classList.remove('d-none')
    } else {
      button.classList.remove('active', 'text-black')
      button.classList.add('text-secondary')
      card.classList.add('d-none')
    }
  })

  if (activeButtonName === 'History') {
    await fetchHistories()
  }

  if (activeButtonName === 'Directory') {
    await fetchAddresses()
  }
}

/** ======= Tab utilities end ======= */

/** ======= Address utilities start ======= */
const createAddressListItem = (address) => {
  const displayName = escapeHTML(address.display_name)
  const type = escapeHTML(address.type)

  const listItem = document.createElement('li')
  listItem.className = 'list-group-item'
  listItem.id = address.id

  const container = document.createElement('div')
  container.className = 'container p-0'
  listItem.appendChild(container)

  const row = document.createElement('div')
  row.className = 'row'
  container.appendChild(row)

  const col1 = document.createElement('div')
  col1.className = 'col-10'
  row.appendChild(col1)

  const badge = document.createElement('span')
  badge.className = 'badge bg-primary me-2'
  badge.textContent = type
  col1.appendChild(badge)

  const addressNameLink = document.createElement('button')
  addressNameLink.textContent = displayName
  addressNameLink.className = 'btn btn-link p-0'
  addressNameLink.onclick = () => openMessageModal(address)
  col1.appendChild(addressNameLink)

  const col2 = document.createElement('div')
  col2.className = 'col'
  row.appendChild(col2)

  Object.entries(address.channels).forEach(([channelName, channelValue]) => {
    const button = document.createElement('button')
    button.className = 'btn btn-sm btn-success'

    const icon = document.createElement('i')
    if (channelName !== 'messaging') {
      button.addEventListener('click', () => dialAddress(channelValue))
    } else {
      button.addEventListener('click', () => {
        subscribeToNewMessages()
        openMessageModal(address)
      })
    }
    if (channelName === 'messaging') {
      icon.className = 'bi bi-chat'
    } else if (channelName === 'video') {
      icon.className = 'bi bi-camera-video'
    } else if (channelName === 'audio') {
      icon.className = 'bi bi-phone'
    }
    button.appendChild(icon)

    col2.appendChild(button)
  })

  const row2 = document.createElement('div')
  const addressUrl = Object.values(address.channels)[0]
  let strippedUrl = addressUrl.split('?')[0]
  row2.textContent = strippedUrl
  container.appendChild(row2)

  return listItem
}

function updateAddressUI() {
  const addressesPlaceholder = document.getElementById('addressesPlaceholder')
  const addressesList = document.getElementById('addressesList')
  const addressPagination = document.getElementById('addressPagination')
  const { data: addresses } = window.__addressData

  if (!addresses || addresses.length === 0) {
    addressesList.classList.add('d-none')
    addressesPlaceholder.classList.remove('d-none')
    addressPagination.style.setProperty('display', 'none', 'important')
    return
  }

  addressesPlaceholder.classList.add('d-none')
  addressesList.classList.remove('d-none')
  addressPagination.style.removeProperty('display')

  addressesList.innerHTML = ''
  addresses
    .map(createAddressListItem)
    .forEach((item) => addressesList.appendChild(item))
  subscribeToNewMessages()
}

async function fetchAddresses() {
  const client = getActiveClient()
  if (!client) return
  
  try {
    const searchText = searchInput.value
    const selectedType = searchType.value

    const addressData = await client.address.getAddresses({
      type: selectedType === 'all' ? undefined : selectedType,
      displayName: !searchText.length ? undefined : searchText,
      pageSize: 10,
    })
    window.__addressData = addressData
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch addresses', error)
    showError('Unable to fetch addresses: ' + error.message)
  }
}

window.dialAddress = async (address) => {
  const client = getActiveClient()
  if (!client) {
    showError('No active client. Please connect first.')
    return
  }

  if (!selectedProfileId) {
    showError('No profile selected.')
    return
  }

  // Check if there's already an active call for this profile
  if (activeCalls.has(selectedProfileId)) {
    showError('There is already an active call for this profile.')
    return
  }

  try {
    console.log('Dialing address:', address)
    updateCallStatus('Dialing...', address)
    
    // Start the call
    const call = await client.dial({
      to: address,
      rootElement: document.getElementById('rootElement') || document.body,
      video: false, // Default to audio only for simplicity
      audio: true,
    })

    // Store the call instance
    activeCalls.set(selectedProfileId, call)
    callStartTime = Date.now()
    
    // Set up call event listeners
    setupCallEventHandlers(call)
    
    // Start the call
    await call.start()
    
    console.log('Call started successfully:', call)
    showSuccess(`Call started to: ${address}`)
    
  } catch (error) {
    console.error('Failed to dial address:', error)
    showError('Failed to start call: ' + error.message)
    updateCallStatus('Call Failed', address)
    
    // Clean up on failure
    activeCalls.delete(selectedProfileId)
    callStartTime = null
    hideCallStatus()
  }
}

/**
 * Set up event handlers for call instance
 */
function setupCallEventHandlers(call) {
  call.on('call.state', (params) => {
    console.debug('>> call.state', params)
    updateCallStatus(params.call_state || 'Unknown', call.to)
  })

  call.on('call.joined', (params) => {
    console.debug('>> call.joined', params)
    updateCallStatus('Connected', call.to)
    showCallStatus()
    startCallTimer()
  })

  call.on('call.updated', (params) => {
    console.debug('>> call.updated', params)
  })

  call.on('call.left', (params) => {
    console.debug('>> call.left', params)
    updateCallStatus('Call Ended', call.to)
    cleanupCall()
  })

  call.on('call.connect', (params) => {
    console.debug('>> call.connect', params)
    updateCallStatus('Connecting...', call.to)
  })

  call.on('destroy', () => {
    console.debug('>> call destroyed')
    updateCallStatus('Call Ended', call.to)
    cleanupCall()
  })

  call.on('media.connected', () => {
    console.debug('>> media connected')
    updateCallStatus('Media Connected', call.to)
  })

  call.on('media.disconnected', () => {
    console.debug('>> media disconnected')
    updateCallStatus('Media Disconnected', call.to)
  })
}

/**
 * Update call status UI
 */
function updateCallStatus(status, address) {
  const callStatusElement = document.getElementById('callStatus')
  const callAddressElement = document.getElementById('callAddress')
  
  if (callStatusElement) {
    callStatusElement.textContent = status
  }
  
  if (callAddressElement && address) {
    // Clean up the address display
    const cleanAddress = address.split('?')[0]
    callAddressElement.textContent = cleanAddress
    callAddressElement.title = address // Full address in tooltip
  }
}

/**
 * Show the call status card
 */
function showCallStatus() {
  const callStatusCard = document.getElementById('callStatusCard')
  if (callStatusCard) {
    callStatusCard.classList.remove('d-none')
  }
}

/**
 * Hide the call status card
 */
function hideCallStatus() {
  const callStatusCard = document.getElementById('callStatusCard')
  if (callStatusCard) {
    callStatusCard.classList.add('d-none')
  }
  stopCallTimer()
}

/**
 * Start the call duration timer
 */
let callTimerInterval = null
function startCallTimer() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval)
  }
  
  callTimerInterval = setInterval(() => {
    if (callStartTime) {
      const duration = Date.now() - callStartTime
      const minutes = Math.floor(duration / 60000)
      const seconds = Math.floor((duration % 60000) / 1000)
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      const callDurationElement = document.getElementById('callDuration')
      if (callDurationElement) {
        callDurationElement.textContent = formattedTime
      }
    }
  }, 1000)
}

/**
 * Stop the call duration timer
 */
function stopCallTimer() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval)
    callTimerInterval = null
  }
  
  const callDurationElement = document.getElementById('callDuration')
  if (callDurationElement) {
    callDurationElement.textContent = '00:00'
  }
}

/**
 * Clean up call state after call ends
 */
function cleanupCall() {
  if (selectedProfileId) {
    activeCalls.delete(selectedProfileId)
  }
  callStartTime = null
  stopCallTimer()
  setTimeout(() => {
    hideCallStatus()
  }, 3000) // Hide after 3 seconds
}

/**
 * Hangup the active call
 */
window.hangupCall = async () => {
  if (!selectedProfileId || !activeCalls.has(selectedProfileId)) {
    showError('No active call to hangup.')
    return
  }

  try {
    const call = activeCalls.get(selectedProfileId)
    console.log('Hanging up call:', call)
    
    updateCallStatus('Hanging up...', call.to)
    
    await call.hangup()
    
    console.log('Call hung up successfully')
    showSuccess('Call ended successfully')
    
  } catch (error) {
    console.error('Failed to hangup call:', error)
    showError('Failed to end call: ' + error.message)
    
    // Force cleanup even if hangup failed
    cleanupCall()
  }
}

/**
 * Open the execute method modal
 */
window.openExecuteModal = () => {
  if (!selectedProfileId || !activeCalls.has(selectedProfileId)) {
    showError('No active call to execute methods on.')
    return
  }

  const executeModal = new bootstrap.Modal(document.getElementById('executeModal'))
  executeModal.show()
}

/**
 * Execute a method on the active call
 */
window.executeMethod = async () => {
  if (!selectedProfileId || !activeCalls.has(selectedProfileId)) {
    showError('No active call to execute methods on.')
    return
  }

  const methodSelect = document.getElementById('executeMethod')
  const paramsTextarea = document.getElementById('executeParams')
  
  const method = methodSelect.value
  const paramsText = paramsTextarea.value.trim()
  
  if (!method) {
    showError('Please select a method to execute.')
    return
  }
  
  let params = {}
  if (paramsText) {
    try {
      params = JSON.parse(paramsText)
    } catch (error) {
      showError('Invalid JSON in parameters: ' + error.message)
      return
    }
  }

  try {
    const call = activeCalls.get(selectedProfileId)
    console.log(`Executing method "${method}" with params:`, params)
    
    // Execute the method based on type
    let result
    switch (method) {
      case 'play':
        result = await call.play(params)
        break
      case 'say':
        result = await call.say(params)
        break
      case 'record':
        result = await call.record(params)
        break
      case 'detect':
        result = await call.detect(params)
        break
      default:
        // Try to execute as generic method
        result = await call.execute({ method, params })
        break
    }
    
    console.log(`Method "${method}" executed successfully:`, result)
    showSuccess(`Method "${method}" executed successfully`)
    
    // Close the modal
    const executeModal = bootstrap.Modal.getInstance(document.getElementById('executeModal'))
    executeModal.hide()
    
    // Clear the form
    methodSelect.value = ''
    paramsTextarea.value = ''
    
  } catch (error) {
    console.error(`Failed to execute method "${method}":`, error)
    showError(`Failed to execute method "${method}": ` + error.message)
  }
}

window.fetchNextAddresses = async () => {
  const { nextPage } = window.__addressData
  try {
    const nextAddresses = await nextPage()
    window.__addressData = nextAddresses
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch next addresses', error)
  }
}

window.fetchPrevAddresses = async () => {
  const { prevPage } = window.__addressData
  try {
    const prevAddresses = await prevPage()
    window.__addressData = prevAddresses
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch prev addresses', error)
  }
}

let debounceTimeout
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimeout)
  // Search after 1 seconds when user stops typing
  debounceTimeout = setTimeout(fetchAddresses, 1000)
})

searchType.addEventListener('change', fetchAddresses)

sendMessageBtn.addEventListener('click', async () => {
  const client = getActiveClient()
  if (!client) {
    showError('No active client. Please connect first.')
    return
  }
  
  const address = window.__currentAddress
  const text = conversationMessageInput.value
  
  if (!text.trim()) {
    showError('Please enter a message')
    return
  }
  
  try {
    await client.conversation.sendMessage({
      addressId: address.id,
      text,
    })
    conversationMessageInput.value = ''
  } catch (error) {
    console.error('Failed to send message:', error)
    showError('Failed to send message: ' + error.message)
  }
})

/** ======= Address utilities end ======= */

/** ======= History utilities start ======= */
function formatMessageDate(date) {
  const dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }
  return new Date(date).toLocaleString('en-US', dateOptions)
}

function createConversationListItem(convo) {
  const item = document.createElement('li')
  item.classList.add('list-group-item')
  item.id = convo.id

  const convoDiv = document.createElement('div')
  convoDiv.className = 'd-flex align-items-center'

  const labelSpan = document.createElement('span')
  labelSpan.textContent = 'Conversation name: '
  labelSpan.className = 'me-1'

  const convoNameLink = document.createElement('button')
  convoNameLink.textContent = convo.name
  convoNameLink.className = 'btn btn-link p-0'
  convoNameLink.onclick = () => openMessageModal(convo)

  convoDiv.appendChild(labelSpan)
  convoDiv.appendChild(convoNameLink)
  item.appendChild(convoDiv)

  const lastMessageDiv = document.createElement('div')
  lastMessageDiv.textContent = `Last message at: ${formatMessageDate(
    convo.last_message_at
  )}`
  lastMessageDiv.classList.add('small', 'text-secondary')
  item.appendChild(lastMessageDiv)
  return item
}

function updateHistoryUI() {
  const historyPlaceholder = document.getElementById('historyPlaceholder')
  const historiesList = document.getElementById('historiesList')
  const { data: histories } = window.__historyData

  if (!histories || histories.length === 0) {
    historiesList.classList.add('d-none')
    historyPlaceholder.classList.remove('d-none')
    return
  }

  historyPlaceholder.classList.add('d-none')
  historiesList.classList.remove('d-none')

  historiesList.innerHTML = ''
  histories
    .map(createConversationListItem)
    .forEach((item) => historiesList.appendChild(item))
}

async function fetchHistories() {
  const client = getActiveClient()
  if (!client) return
  
  try {
    const historyData = await client.conversation.getConversations({
      pageSize: 10,
    })
    window.__historyData = historyData
    updateHistoryUI()
    subscribeToNewMessages()
  } catch (error) {
    console.error('Unable to fetch histories', error)
    showError('Unable to fetch histories: ' + error.message)
  }
}

function createLiveMessageListItem(msg) {
  const listItem = document.createElement('li')
  listItem.classList.add('list-group-item')
  listItem.id = msg.id
  const formattedTimestamp = formatMessageDate(msg.ts * 1000)
  listItem.innerHTML = `
    <div class="d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0 text-capitalize">${msg.type ?? 'unknown'}</h6>
          <p class="mb-1 fst-italic">${msg.conversation_name}</p>
        <div>
        <div class="d-flex align-items-center gap-1">
          <span class="badge bg-info">${msg.subtype ?? 'unknown'}</span>
          <span class="badge bg-success">${msg.kind ?? 'unknown'}</span>
        </div>
      </div>
      <p class="text-muted small mb-0">${formattedTimestamp}</p>
    </div>
  `
  return listItem
}

let isConvoSubscribed = false
function subscribeToNewMessages() {
  const client = getActiveClient()
  if (!client || isConvoSubscribed) return

  client.conversation.subscribe((newMsg) => {
    console.log('New message received!', newMsg)

    // Refetch both histories and directories to update the last message time (no await)
    Promise.all([fetchHistories(), fetchAddresses()])

    // If message modal is opened, update modal message list
    const oldMessages = window.__messageData
    if (
      oldMessages &&
      newMsg.conversation_id === oldMessages?.data?.[0]?.conversation_id
    ) {
      const messageList = msgModalDiv.querySelector('#messageList')
      const newListItem = createMessageListItem(newMsg)
      if (messageList.firstChild) {
        messageList.insertBefore(newListItem, messageList.firstChild)
      } else {
        messageList.appendChild(newListItem)
      }
    }

    // Update in call live messages
    const liveMessageList = document.querySelector('#liveMessageList')
    const newListItem = createLiveMessageListItem(newMsg)
    if (liveMessageList.firstChild) {
      liveMessageList.insertBefore(newListItem, liveMessageList.firstChild)
    } else {
      liveMessageList.appendChild(newListItem)
    }
  })
  isConvoSubscribed = true
}

/** ======= History utilities end ======= */

/** ======= Message utilities start ======= */
function createMessageListItem(msg) {
  const listItem = document.createElement('li')
  listItem.classList.add('list-group-item')
  listItem.id = msg.id
  const formattedTimestamp = formatMessageDate(msg.ts * 1000)
  listItem.innerHTML = `
    <div class="d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center">
        <h6 class="mb-0 text-capitalize">${msg.text}</h6>
        <div class="d-flex align-items-center gap-1">
          <span class="badge bg-info">${msg.type}</span>
          <span class="badge bg-info">${msg.subtype ?? 'unknown'}</span>
          <span class="badge bg-success">${msg.kind ?? 'unknown'}</span>
        </div>
      </div>
      <p class="text-muted small mb-0">${formattedTimestamp}</p>
    </div>
  `
  return listItem
}

const msgModalDiv = document.getElementById('messageModal')

msgModalDiv.addEventListener('hidden.bs.modal', clearMessageModal)

function clearMessageModal() {
  window.__messageData = null
  const titleH2 = msgModalDiv.querySelector('.title')
  const typeBadgeSpan = msgModalDiv.querySelector('.type-badge')
  const contactBtnDiv = msgModalDiv.querySelector('.contact-buttons')
  const messageList = msgModalDiv.querySelector('#messageList')
  const loaderListItem = msgModalDiv.querySelector('#messageList li')
  const avatarImage = msgModalDiv.querySelector('.avatar')
  titleH2.textContent = ''
  typeBadgeSpan.textContent = ''
  contactBtnDiv.classList.add('d-none')
  // Remove all the message list item except the first one (loader)
  Array.from(messageList.children)
    .slice(1)
    .forEach((item) => item.remove())
  loaderListItem.classList.remove('d-none')
  // Set the new image URL to the avatar image for the next time the modal opens
  const newImageUrl = `https://i.pravatar.cc/125?img=${
    Math.floor(Math.random() * 70) + 1
  }`
  if (avatarImage) {
    avatarImage.src = newImageUrl
  }
  window.__currentAddress = undefined
}

async function openMessageModal(data) {
  window.__currentAddress = data
  const modal = new bootstrap.Modal(msgModalDiv)
  modal.show()

  const titleH2 = msgModalDiv.querySelector('.title')
  titleH2.textContent = data.display_name || data.name || 'John Doe'

  if (data.type) {
    const typeBadgeSpan = msgModalDiv.querySelector('.type-badge')
    typeBadgeSpan.textContent = data.type
    typeBadgeSpan.classList.add('badge', 'bg-primary')
  }

  if (data.channels) {
    const contactBtnDiv = msgModalDiv.querySelector('.contact-buttons')
    contactBtnDiv.classList.remove('d-none')
    if (data.channels.audio) {
      const audioBtn = contactBtnDiv.querySelector('.btn-dial-audio')
      audioBtn.classList.remove('d-none')
      audioBtn.addEventListener('click', () => {
        dialAddress(data.channels.audio)
        modal.hide()
      })
    }
    if (data.channels.video) {
      const videoBtn = contactBtnDiv.querySelector('.btn-dial-video')
      videoBtn.classList.remove('d-none')
      videoBtn.addEventListener('click', () => {
        dialAddress(data.channels.video)
        modal.hide()
      })
    }
    if (data.channels.messaging) {
      const messagingBtn = contactBtnDiv.querySelector('.btn-dial-messaging')
      messagingBtn.classList.remove('d-none')
      messagingBtn.addEventListener('click', () => {
        dialAddress(data.channels.messaging)
        modal.hide()
      })
    }
  }

  // Fetch messages and populate the UI
  await fetchMessages(data.id)
}

function updateMessageUI() {
  const { data: messages } = window.__messageData
  const messageList = msgModalDiv.querySelector('#messageList')
  const loaderListItem = messageList.querySelector('li')
  loaderListItem.classList.add('d-none')
  if (!messages?.length) {
    const noMsglistItem = document.createElement('li')
    noMsglistItem.classList.add('list-group-item')
    noMsglistItem.innerHTML = `
      <div class="d-flex justify-content-center">
          <h6 class="my-2">No messages yet!</h6>
      </div>
    `
    messageList.appendChild(noMsglistItem)
    return
  }
  messages
    .map(createMessageListItem)
    .forEach((li) => messageList.appendChild(li))
}

async function fetchMessages(id) {
  const client = getActiveClient()
  if (!client) return
  
  try {
    const messages = await client.conversation.getConversationMessages({
      addressId: id,
    })
    window.__messageData = messages
    await client.conversation.join({
      addressId: id,
    })
    updateMessageUI()
  } catch (error) {
    console.error('Unable to fetch messages', error)
    showError('Unable to fetch messages: ' + error.message)
  }
}

/** ======= Message utilities end ======= */