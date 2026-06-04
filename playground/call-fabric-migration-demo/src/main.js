/**
 * Call Fabric Demo — v4 SDK Migration
 *
 * This file migrates the original call-fabric-client-beta application
 * from @signalwire/client (v3) to @signalwire/js (v4).
 *
 * Key architectural differences:
 *
 * 1. INITIALIZATION
 *    v3: const client = await SignalWire({ host, token }) — async factory
 *    v4: const client = new SignalWire(credentialProvider) — class constructor
 *
 * 2. AUTHENTICATION
 *    v3: Token passed directly to factory ({ token })
 *    v4: CredentialProvider pattern — custom implementations per auth flow:
 *        - UserCredentialProvider: SAT via reference/password, with auto-refresh
 *        - StaticCredentialProvider: pre-obtained tokens (build-time SAT)
 *
 * 3. STATE MANAGEMENT
 *    v3: Event emitter pattern — roomObj.on('event', handler)
 *    v4: RxJS observables — call.status$.subscribe(handler)
 *        All state is reactive and composable
 *
 * 4. CALL CONTROLS
 *    v3: Methods on the room object — roomObj.audioMute(), roomObj.videoMute()
 *    v4: Methods on SelfParticipant — call.self.toggleMute(), call.self.toggleMuteVideo()
 *
 * 5. MEDIA RENDERING
 *    v3: rootElement passed to dial() — SDK manages video DOM
 *    v4: <sw-call-media>, <sw-self-media>, <sw-participants> web components
 *        Set component.call = call — components manage streams internally
 *        (Alternative: localStream$/remoteStream$ observables + manual <video> srcObject)
 *
 * 6. DEVICES
 *    v3: Standalone functions — getCameraDevicesWithPermissions(), roomObj.updateCamera()
 *    v4: Observable streams — client.audioInputDevices$, self.selectAudioInputDevice()
 *
 * 7. DIRECTORY
 *    v3: Paginated API calls — client.address.getAddresses({ pageSize, type })
 *    v4: Observable directory — client.directory.addresses$, directory.loadMore()
 *
 * 8. INBOUND CALLS
 *    v3: client.online({ incomingCallHandlers }) / client.offline()
 *    v4: client.session.incomingCalls$ observable (always active)
 *
 * 9. MESSAGING
 *    v3: client.conversation.sendMessage() / subscribe()
 *    v4: callAddress.sendText() / callAddress.textMessages$ observable
 */

import { filter, take } from 'rxjs';
import { StaticCredentialProvider, SignalWire } from '@signalwire/js';

// Import UI components library — registers <sw-call-media>, <sw-self-media>,
// <sw-participants> etc. as custom elements globally
import '@signalwire/web-components';
import { UserCredentialProvider } from './UserCredentialProvider.js';
import {
  AUTH_METHODS,
  getStoredToken,
  getStoredAuthMethod,
  storeToken,
  clearToken,
} from './auth.js';

// ============================================================
// TOKEN CONFIGURATION (injected by Vite define from root .env)
// ============================================================

/* global SAT_TOKEN */
const buildTimeToken = typeof SAT_TOKEN !== 'undefined' ? SAT_TOKEN : null;

// ============================================================
// DOM REFERENCES
// Cache all DOM elements at initialization (kitchen-sink pattern)
// ============================================================

const DOM = {
  // Auth Screen
  authScreen: document.getElementById('authScreen'),
  mainApp: document.getElementById('mainApp'),
  userForm: document.getElementById('userForm'),
  userRef: document.getElementById('userRef'),
  userPass: document.getElementById('userPass'),
  buildTimeTokenSection: document.getElementById('buildTimeTokenSection'),
  buildTimeTokenBtn: document.getElementById('buildTimeTokenBtn'),
  authError: document.getElementById('authError'),
  authLoading: document.getElementById('authLoading'),

  // Navbar
  authMethodBadge: document.getElementById('authMethodBadge'),
  signOutBtn: document.getElementById('signOutBtn'),

  // Connection
  connectionStatus: document.getElementById('connectionStatus'),
  userInfo: document.getElementById('userInfo'),

  // Dial
  destinationInput: document.getElementById('destinationInput'),
  dialBtn: document.getElementById('dialBtn'),
  hangupBtn: document.getElementById('hangupBtn'),

  // Availability
  availabilityBadge: document.getElementById('availabilityBadge'),

  // Call Controls Card
  callControlsCard: document.getElementById('callControlsCard'),
  toggleAudioBtn: document.getElementById('toggleAudioBtn'),
  toggleVideoBtn: document.getElementById('toggleVideoBtn'),
  toggleDeafBtn: document.getElementById('toggleDeafBtn'),
  toggleHandRaiseBtn: document.getElementById('toggleHandRaiseBtn'),
  screenShareBtn: document.getElementById('screenShareBtn'),
  holdBtn: document.getElementById('holdBtn'),

  // Audio Processing
  toggleEchoCancelBtn: document.getElementById('toggleEchoCancelBtn'),
  toggleAutoGainBtn: document.getElementById('toggleAutoGainBtn'),
  toggleNoiseSuppressionBtn: document.getElementById('toggleNoiseSuppressionBtn'),

  // Volume
  micVolumeSlider: document.getElementById('micVolumeSlider'),
  micVolumeValue: document.getElementById('micVolumeValue'),
  speakerVolumeSlider: document.getElementById('speakerVolumeSlider'),
  speakerVolumeValue: document.getElementById('speakerVolumeValue'),
  inputSensitivitySlider: document.getElementById('inputSensitivitySlider'),
  inputSensitivityValue: document.getElementById('inputSensitivityValue'),

  // Layout
  currentLayout: document.getElementById('currentLayout'),
  layoutSelect: document.getElementById('layoutSelect'),
  setLayoutBtn: document.getElementById('setLayoutBtn'),

  // Call Info
  callStatusText: document.getElementById('callStatusText'),
  callDirectionText: document.getElementById('callDirectionText'),
  callRecordingText: document.getElementById('callRecordingText'),
  callStreamingText: document.getElementById('callStreamingText'),
  callLockedText: document.getElementById('callLockedText'),
  callHandPriorityText: document.getElementById('callHandPriorityText'),
  audioDirectionText: document.getElementById('audioDirectionText'),
  videoDirectionText: document.getElementById('videoDirectionText'),
  capabilitiesContainer: document.getElementById('capabilitiesContainer'),
  callMetaDisplay: document.getElementById('callMetaDisplay'),

  // Device Selection
  deviceSelectionCard: document.getElementById('deviceSelectionCard'),
  audioInputSelect: document.getElementById('audioInputSelect'),
  videoInputSelect: document.getElementById('videoInputSelect'),
  audioOutputSelect: document.getElementById('audioOutputSelect'),

  // Directory
  addressesList: document.getElementById('addressesList'),
  directorySearch: document.getElementById('directorySearch'),
  directoryScroll: document.getElementById('directoryScroll'),
  directorySentinel: document.getElementById('directorySentinel'),
  addressCount: document.getElementById('addressCount'),

  // Messages
  messagesContainer: document.getElementById('messagesContainer'),
  messageInput: document.getElementById('messageInput'),
  sendMessageBtn: document.getElementById('sendMessageBtn'),

  // Video (sw-call-provider bridges the call into Lit context for child components)
  callProvider: document.getElementById('callProvider'),
  callMedia: document.getElementById('callMedia'),

  // Participants
  participantsCard: document.getElementById('participantsCard'),
  participantCount: document.getElementById('participantCount'),
  participantsList: document.getElementById('participantsList'),

  // Incoming Call Modal
  incomingCallModal: document.getElementById('incomingCallModal'),
  incomingCallerName: document.getElementById('incomingCallerName'),
  incomingCallerAddress: document.getElementById('incomingCallerAddress'),
  acceptCallBtn: document.getElementById('acceptCallBtn'),
  rejectCallBtn: document.getElementById('rejectCallBtn'),

  // Templates
  addressCardTemplate: document.getElementById('addressCardTemplate'),
  participantItemTemplate: document.getElementById('participantItemTemplate'),
  messageItemTemplate: document.getElementById('messageItemTemplate'),
};

// ============================================================
// STATE
// ============================================================

/** @type {import('@signalwire/js').SignalWire | null} */
let client = null;

/** @type {import('@signalwire/js').Call | null} */
let currentCall = null;

/** @type {import('@signalwire/js').CallAddress | null} */
let currentCallAddress = null;

/** @type {import('rxjs').Subscription | null} */
let messagesSubscription = null;

/** @type {import('@signalwire/js').Call | null} */
let currentRingingCall = null;

/** @type {boolean} */
let isHolding = false;

// Track all subscriptions for cleanup on call end
/** @type {import('rxjs').Subscription[]} */
let callSubscriptions = [];

// Guards to prevent duplicate subscriptions on reconnect
let directoryInitialized = false;
let incomingCallsInitialized = false;

// Track current device lists for selection lookup
let currentAudioInputDevices = [];
let currentVideoInputDevices = [];
let currentAudioOutputDevices = [];

// Persist destination across sessions (matching original app behavior)
const savedDestination = localStorage.getItem('cf_destination');
if (savedDestination) {
  DOM.destinationInput.value = savedDestination;
}
DOM.destinationInput.addEventListener('change', () => {
  localStorage.setItem('cf_destination', DOM.destinationInput.value);
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get initials from a display name (for avatar rendering).
 * Returns "tel" for phone numbers (matching original behavior).
 */
function getInitials(name) {
  if (!name) return '?';
  if (name.startsWith('+')) return 'tel';
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/** Get avatar CSS class based on address type */
function getAvatarClass(type) {
  switch (type) {
    case 'room': return 'type-room';
    case 'app': return 'type-app';
    case 'call': return 'type-call';
    default: return 'type-default';
  }
}

/** Create a boolean badge (checkmark or X) */
function booleanBadge(value) {
  return value
    ? '<span class="text-success fw-bold">Yes</span>'
    : '<span class="text-muted">No</span>';
}

/**
 * Safely set user info in the DOM using textContent (avoids XSS)
 */
function renderUserInfo(id, email) {
  DOM.userInfo.innerHTML = '';

  const idP = document.createElement('p');
  idP.className = 'mb-1';
  idP.innerHTML = '<strong>ID:</strong> ';
  const idSpan = document.createElement('span');
  idSpan.className = 'text-break';
  idSpan.textContent = id || 'Loading...';
  idP.appendChild(idSpan);
  DOM.userInfo.appendChild(idP);

  const emailP = document.createElement('p');
  emailP.className = 'mb-0';
  emailP.innerHTML = '<strong>Email:</strong> ';
  const emailSpan = document.createElement('span');
  emailSpan.textContent = email || 'Loading...';
  emailP.appendChild(emailSpan);
  DOM.userInfo.appendChild(emailP);
}

/**
 * Safely render capabilities badges (avoids XSS from server data)
 */
function renderCapabilities(capabilities) {
  DOM.capabilitiesContainer.innerHTML = '';
  if (capabilities.length === 0) {
    DOM.capabilitiesContainer.innerHTML = '<span class="text-muted small">No capabilities</span>';
    return;
  }
  capabilities.forEach((cap) => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary me-1';
    badge.textContent = cap;
    DOM.capabilitiesContainer.appendChild(badge);
  });
}

// ============================================================
// AUTH SCREEN UI
//
// Migration note:
// Original had separate pages for auth
//
// v4 demo: Single-page auth screen with two methods:
//   - User: Form → Vite middleware proxy → SAT token
//   - Build-time token: Pre-generated SAT_TOKEN from issue-sat.js
// ============================================================

function showAuthScreen() {
  DOM.authScreen.classList.remove('d-none');
  DOM.mainApp.classList.add('d-none');
}

function showMainApp(authMethod) {
  DOM.authScreen.classList.add('d-none');
  DOM.mainApp.classList.remove('d-none');

  // Show auth method badge in navbar
  const methodLabels = {
    [AUTH_METHODS.USER]: 'User',
    [AUTH_METHODS.BUILD_TIME]: 'Build Token',
  };
  DOM.authMethodBadge.textContent = methodLabels[authMethod] || authMethod;
}

function showAuthError(message) {
  DOM.authError.textContent = message;
  DOM.authError.classList.remove('d-none');
  DOM.authLoading.classList.add('d-none');
}

function hideAuthError() {
  DOM.authError.classList.add('d-none');
}

function showAuthLoading() {
  DOM.authLoading.classList.remove('d-none');
  DOM.authError.classList.add('d-none');
}

function hideAuthLoading() {
  DOM.authLoading.classList.add('d-none');
}

function setupAuthScreen() {
  // Show build-time token button if SAT_TOKEN is available
  if (buildTimeToken) {
    DOM.buildTimeTokenSection.classList.remove('d-none');
    DOM.buildTimeTokenBtn.onclick = () => {
      storeToken(buildTimeToken, AUTH_METHODS.BUILD_TIME);
      const provider = new StaticCredentialProvider({ token: buildTimeToken });
      initializeApp(provider, AUTH_METHODS.BUILD_TIME);
    };
  }

  // User sign-in form — creates a UserCredentialProvider
  // The provider handles token fetching via authenticate() and
  // automatic refresh via refresh() using the same credentials.
  DOM.userForm.onsubmit = async (e) => {
    e.preventDefault();
    const reference = DOM.userRef.value.trim();
    const password = DOM.userPass.value;

    if (!reference || !password) {
      showAuthError('Please enter both reference and password.');
      return;
    }

    try {
      hideAuthError();
      showAuthLoading();
      const provider = new UserCredentialProvider({ reference, password });
      initializeApp(provider, AUTH_METHODS.USER);
    } catch (error) {
      showAuthError(error.message);
    }
  };

  // Sign out button
  DOM.signOutBtn.onclick = () => {
    clearToken();
    if (client) {
      client.destroy();
      client = null;
    }
    directoryInitialized = false;
    incomingCallsInitialized = false;
    showAuthScreen();
  };
}

// ============================================================
// INITIALIZE APP (deferred until after authentication)
//
// Migration note:
// v3: const client = await SignalWire({ host, token, debug: { logWsTraffic: true } })
//     - Async factory function
//     - Accepts host, token, and debug options
//
// v4: const client = new SignalWire(credentialProvider)
//     - Synchronous constructor
//     - Uses CredentialProvider pattern for token management
//     - The SDK calls credentialProvider.authenticate() during connection
//     - If refresh() is provided and expiry_at is set, the SDK
//       automatically refreshes credentials before they expire
//     - Connection happens automatically on observable subscription
//
// Available credential providers:
//   - StaticCredentialProvider  — for pre-obtained tokens (e.g. build-time SAT)
//   - UserCredentialProvider — fetches SAT via reference/password, with auto-refresh
// ============================================================

function initializeApp(credentialProvider, authMethod) {
  hideAuthLoading();
  showMainApp(authMethod);

  // Create the SignalWire client with the chosen credential provider
  // The SDK calls credentialProvider.authenticate() to obtain the token
  client = new SignalWire(credentialProvider);

  // Expose client for console debugging (same as original app)
  window.client = client;

  // Set up device subscriptions
  setupDeviceObservables();

  // Set up dial button handler
  setupDialHandler();

  // Set up connection state subscriptions
  setupConnectionObservables();
}

// ============================================================
// DEVICE MANAGEMENT
//
// Migration note:
// v3: Standalone functions — enumerateDevices(), getCameraDevicesWithPermissions()
//     Device changes detected via createDeviceWatcher()
//     Updates via roomObj.updateMicrophone({ deviceId })
//
// v4: Observable streams on the client instance:
//     - client.audioInputDevices$  — emits MediaDeviceInfo[] reactively
//     - client.audioOutputDevices$ — emits speakers list
//     - client.videoInputDevices$  — emits cameras list
//     Device selection via self.selectAudioInputDevice(device)
// ============================================================

/** Populate a <select> element with device options, preserving current selection */
function populateDeviceSelect(selectEl, devices, labelPrefix) {
  const currentValue = selectEl.value;
  selectEl.innerHTML = `<option value="">Select ${labelPrefix}...</option>`;
  devices.forEach((device) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${labelPrefix} ${device.deviceId.substring(0, 8)}`;
    selectEl.appendChild(option);
  });
  // Restore selection if the device is still available
  if (currentValue && devices.some((d) => d.deviceId === currentValue)) {
    selectEl.value = currentValue;
  }
}

function setupDeviceObservables() {
  // Subscribe to device observables (these work even before a call starts)
  client.audioInputDevices$.subscribe((devices) => {
    currentAudioInputDevices = devices;
    populateDeviceSelect(DOM.audioInputSelect, devices, 'microphone');
  });

  client.audioOutputDevices$.subscribe((devices) => {
    currentAudioOutputDevices = devices;
    populateDeviceSelect(DOM.audioOutputSelect, devices, 'speaker');
  });

  client.videoInputDevices$.subscribe((devices) => {
    currentVideoInputDevices = devices;
    populateDeviceSelect(DOM.videoInputSelect, devices, 'camera');
  });
}

// ============================================================
// DIRECTORY
//
// Migration note:
// v3: const data = await client.address.getAddresses({ type, displayName, pageSize: 10 })
//     data.data (array), data.hasNext, data.hasPrev, data.nextPage(), data.prevPage()
//
// v4: const directory = client.directory
//     directory.addresses$    — Observable<Address[]> (reactive, accumulates on loadMore)
//     directory.hasMore$      — Observable<boolean>
//     directory.loading$      — Observable<boolean>
//     directory.loadMore()    — fetches next page (appends to addresses$)
// ============================================================

function subscribeToDirectory() {
  const directory = client.directory;
  if (!directory) return;

  let allAddresses = [];
  let searchTerm = '';
  let hasMore = false;
  let isLoading = false;

  // Filter addresses by search term
  function filterAddresses(addresses, term) {
    if (!term) return addresses;
    const lower = term.toLowerCase();
    return addresses.filter(
      (a) =>
        (a.displayName || '').toLowerCase().includes(lower) ||
        (a.type || '').toLowerCase().includes(lower)
    );
  }

  // Render the filtered address list
  function renderList() {
    const filtered = filterAddresses(allAddresses, searchTerm);
    DOM.addressesList.innerHTML = '';

    if (allAddresses.length === 0 && !isLoading) {
      DOM.addressesList.innerHTML =
        '<p class="text-muted small col-12 text-center py-3">No addresses found in directory</p>';
      DOM.addressCount.textContent = '';
      return;
    }

    if (filtered.length === 0 && !isLoading) {
      DOM.addressesList.innerHTML =
        '<p class="text-muted small col-12 text-center py-3">No matches found</p>';
      DOM.addressCount.textContent = `0 of ${allAddresses.length} addresses match`;
      return;
    }

    filtered.forEach((address) => {
      const card = renderAddressCard(address, () => callAddress(address));
      DOM.addressesList.appendChild(card);
    });

    // Update count text
    if (searchTerm) {
      const suffix = hasMore ? '+' : '';
      DOM.addressCount.textContent =
        `${filtered.length} of ${allAddresses.length}${suffix} match`;
    } else {
      DOM.addressCount.textContent = hasMore
        ? `${allAddresses.length} addresses (more available)`
        : `${allAddresses.length} addresses`;
    }
  }

  // Auto-load more when searching and not enough matches found
  function searchAutoLoad() {
    if (!searchTerm || isLoading || !hasMore) return;
    const filtered = filterAddresses(allAddresses, searchTerm);
    if (filtered.length < 6) {
      directory.loadMore();
    }
  }

  // Subscribe to the addresses list
  directory.addresses$.subscribe((addresses) => {
    allAddresses = addresses;
    renderList();
    // If searching and few results, keep loading
    searchAutoLoad();
  });

  // Subscribe to hasMore state for pagination
  directory.hasMore$.subscribe((more) => {
    hasMore = more;
    // Show/hide the sentinel for infinite scroll
    DOM.directorySentinel.classList.toggle('d-none', !more);
    renderList();
  });

  // Subscribe to loading state
  directory.loading$.subscribe((loading) => {
    isLoading = loading;
    DOM.directorySentinel.classList.toggle('d-none', !loading && !hasMore);
  });

  // Infinite scroll: use IntersectionObserver on the sentinel
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        directory.loadMore();
      }
    },
    { root: DOM.directoryScroll, threshold: 0.1 }
  );
  observer.observe(DOM.directorySentinel);

  // Search input with debounce
  let searchTimeout = null;
  DOM.directorySearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchTerm = e.target.value.trim();
      renderList();
      searchAutoLoad();
    }, 250);
  });
}

/** Render an address card from the template */
function renderAddressCard(address, onClick) {
  const template = DOM.addressCardTemplate.content.cloneNode(true);
  const card = template.querySelector('.address-card');
  const avatar = template.querySelector('.address-avatar');
  const initials = template.querySelector('.address-initials');
  const name = template.querySelector('.address-name');
  const type = template.querySelector('.address-type');

  const displayName = address.displayName || 'Unknown';
  initials.textContent = getInitials(displayName);
  name.textContent = displayName;
  name.title = displayName;
  type.textContent = address.type || 'unknown';

  // Set avatar color based on type
  avatar.classList.add(getAvatarClass(address.type));

  card.addEventListener('click', onClick);
  card.dataset.addressId = address.id;

  return template;
}

/**
 * Initiate a call to an address from the directory
 *
 * Migration note:
 * v3: client.dial({ to: address.resource, rootElement, nodeId })
 *     then call.start()
 * v4: client.dial(address.defaultChannel, { video, audio })
 *     Returns a Call object with observables — no start() needed
 */
async function callAddress(address) {
  const channel = address.defaultChannel;
  if (!channel) {
    alert(`No callable channel found for ${address.displayName}`);
    return;
  }

  try {
    currentCall = await client.dial(channel, {
      video: address.type === 'room',
      audio: true,
    });

    if (currentCall) {
      DOM.destinationInput.value = channel;
      subscribeToCallObservables(currentCall);
    }
  } catch (error) {
    console.error('Error calling address:', error);
    alert('Error calling address: ' + error.message);
  }
}

// ============================================================
// CALL MANAGEMENT
//
// Migration note:
// v3: const call = await client.dial({ to, rootElement, nodeId, userVariables })
//     await call.start()
//     roomObj.on('room.joined', handler)
//     roomObj.on('media.connected', handler)
//     roomObj.hangup()
//
// v4: const call = await client.dial(address, { audio, video })
//     call.status$.subscribe(handler)   — replaces on('room.joined')
//     call.localStream$.subscribe(...)  — replaces rootElement auto-rendering
//     call.remoteStream$.subscribe(...) — same
//     call.hangup()
// ============================================================

/**
 * Subscribe to all observables on a Call object.
 * This is the main function that wires up the call UI.
 * All subscriptions are tracked in callSubscriptions[] for cleanup.
 */
function subscribeToCallObservables(call) {
  // Clean up any previous call subscriptions
  cleanupCallSubscriptions();

  // Show call-related UI cards
  DOM.callControlsCard.classList.remove('d-none');
  DOM.deviceSelectionCard.classList.remove('d-none');
  DOM.participantsCard.classList.remove('d-none');

  // Enable hangup button
  DOM.hangupBtn.disabled = false;
  DOM.hangupBtn.onclick = async () => {
    try {
      await call.hangup();
      // onCallEnded() will be triggered by status$ -> 'destroyed'
    } catch (error) {
      console.error('Error hanging up:', error);
      // Fallback cleanup if hangup itself throws
      onCallEnded();
    }
  };

  // --- Call Status ---
  // v3: roomObj.on('room.started/joined/ended', handler)
  // v4: call.status$ observable
  callSubscriptions.push(
    call.status$.subscribe((status) => {
      DOM.callStatusText.textContent = status.toUpperCase();
      DOM.callStatusText.className = getStatusClass(status);

      if (status === 'destroyed') {
        onCallEnded();
      }
    })
  );

  // --- Call Direction ---
  DOM.callDirectionText.textContent = call.direction.toUpperCase();

  // --- Recording state ---
  // v3: roomObj.on('recording.started/ended/updated', handler)
  // v4: call.recording$ observable (boolean)
  callSubscriptions.push(
    call.recording$.subscribe((recording) => {
      DOM.callRecordingText.innerHTML = booleanBadge(recording);
    })
  );

  // --- Streaming state ---
  callSubscriptions.push(
    call.streaming$.subscribe((streaming) => {
      DOM.callStreamingText.innerHTML = booleanBadge(streaming);
    })
  );

  // --- Locked state ---
  callSubscriptions.push(
    call.locked$.subscribe((locked) => {
      DOM.callLockedText.innerHTML = booleanBadge(locked);
    })
  );

  // --- Raise hand priority ---
  callSubscriptions.push(
    call.raiseHandPriority$.subscribe((priority) => {
      DOM.callHandPriorityText.innerHTML = booleanBadge(priority);
    })
  );

  // --- Media directions ---
  callSubscriptions.push(
    call.mediaDirections$.subscribe((directions) => {
      DOM.audioDirectionText.textContent = directions.audio.toUpperCase();
      DOM.videoDirectionText.textContent = directions.video.toUpperCase();
    })
  );

  // --- Capabilities (safe rendering to avoid XSS) ---
  callSubscriptions.push(
    call.capabilities$.subscribe((capabilities) => {
      renderCapabilities(capabilities);
    })
  );

  // --- Meta data ---
  callSubscriptions.push(
    call.meta$.subscribe((meta) => {
      DOM.callMetaDisplay.textContent =
        Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : 'No meta data';
    })
  );

  // --- Layout ---
  // v3: roomObj.on('layout.changed', handler), roomObj.getLayoutList()
  // v4: call.layout$ (current layout), call.layouts$ (available layouts)
  callSubscriptions.push(
    call.layout$.subscribe((layout) => {
      DOM.currentLayout.textContent = layout || '--';
    })
  );

  callSubscriptions.push(
    call.layouts$.subscribe((layouts) => {
      DOM.layoutSelect.innerHTML = '<option value="">Select layout...</option>';
      layouts.forEach((layout) => {
        const option = document.createElement('option');
        option.value = layout;
        option.textContent = layout;
        DOM.layoutSelect.appendChild(option);
      });
    })
  );

  DOM.setLayoutBtn.onclick = async () => {
    const layout = DOM.layoutSelect.value;
    if (!layout) return;
    try {
      await call.setLayout(layout, {});
    } catch (error) {
      console.error('Error setting layout:', error);
      alert('Error setting layout: ' + error.message);
    }
  };

  // --- Video Components ---
  // v3: rootElement handles rendering automatically
  // v4: Set .call on <sw-call-provider> — it provides callStateContext to all child components
  //   (sw-call-media, sw-self-media, sw-participants etc.) via Lit context
  DOM.callProvider.call = call;

  // --- Participants ---
  // v3: roomObj.on('member.joined/updated/left', handler)
  // v4: call.participants$ emits the full participant array on every change
  const participantsMap = new Map();

  callSubscriptions.push(
    call.participants$.subscribe((participants) => {
      DOM.participantCount.textContent = participants.length;

      // Remove participants that left
      participantsMap.forEach((element, id) => {
        if (!participants.find((p) => p.id === id)) {
          element.remove();
          participantsMap.delete(id);
        }
      });

      // Add or update participants
      participants.forEach((participant) => {
        if (!participantsMap.has(participant.id)) {
          const element = renderParticipant(participant);
          DOM.participantsList.appendChild(element);
          participantsMap.set(participant.id, element);
          subscribeToParticipantObservables(participant, element);
        }
      });

      // Show empty state
      if (participants.length === 0) {
        DOM.participantsList.innerHTML =
          '<p class="text-muted small text-center py-3">No participants</p>';
      }
    })
  );

  // --- Self Participant & Controls ---
  // v3: All controls on the room object (roomObj.audioMute(), etc.)
  // v4: Controls on the SelfParticipant via call.self$
  //     Use take(1) to avoid re-initializing controls on every self$ emission
  callSubscriptions.push(
    call.self$.pipe(take(1)).subscribe((self) => {
      if (!self) return;
      setupSelfControls(call, self);
      setupDeviceSelectionHandlers(self);
    })
  );

  // --- Messaging ---
  setupMessaging(call);

  // --- Hold ---
  DOM.holdBtn.onclick = async () => {
    try {
      await call.toggleHold();
      isHolding = !isHolding;
      DOM.holdBtn.innerHTML = isHolding
        ? '<i class="bi bi-play-circle me-1"></i>Resume'
        : '<i class="bi bi-pause-circle me-1"></i>Hold';
      DOM.holdBtn.className = isHolding
        ? 'btn btn-warning btn-sm'
        : 'btn btn-outline-warning btn-sm';
    } catch (error) {
      console.error('Error toggling hold:', error);
      alert('Error toggling hold: ' + error.message);
    }
  };
}

/**
 * Set up controls for the local (self) participant
 *
 * Migration note:
 * v3: roomObj.audioMute/Unmute(), roomObj.videoMute/Unmute(),
 *     roomObj.deaf/undeaf(), roomObj.startScreenShare()
 * v4: self.toggleMute(), self.toggleMuteVideo(),
 *     self.toggleDeaf(), self.startScreenShare()
 */
function setupSelfControls(call, self) {
  // --- Audio Mute ---
  const updateAudioBtn = () => {
    const muted = self.audioMuted;
    DOM.toggleAudioBtn.innerHTML = muted
      ? '<i class="bi bi-mic-mute-fill me-1"></i>Unmute Audio'
      : '<i class="bi bi-mic-fill me-1"></i>Mute Audio';
    DOM.toggleAudioBtn.className = muted
      ? 'btn btn-danger btn-sm'
      : 'btn btn-outline-primary btn-sm';
  };

  DOM.toggleAudioBtn.onclick = async () => {
    try {
      await self.toggleMute();
      updateAudioBtn();
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  callSubscriptions.push(self.audioMuted$.subscribe(() => updateAudioBtn()));

  // --- Video Mute ---
  const updateVideoBtn = () => {
    const muted = self.videoMuted;
    DOM.toggleVideoBtn.innerHTML = muted
      ? '<i class="bi bi-camera-video-off-fill me-1"></i>Start Video'
      : '<i class="bi bi-camera-video-fill me-1"></i>Mute Video';
    DOM.toggleVideoBtn.className = muted
      ? 'btn btn-danger btn-sm'
      : 'btn btn-outline-primary btn-sm';
  };

  DOM.toggleVideoBtn.onclick = async () => {
    try {
      await self.toggleMuteVideo();
      updateVideoBtn();
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  callSubscriptions.push(self.videoMuted$.subscribe(() => updateVideoBtn()));

  // --- Deaf ---
  // v3: roomObj.deaf() / roomObj.undeaf()
  // v4: self.toggleDeaf()
  const updateDeafBtn = () => {
    const isDeaf = self.deaf;
    DOM.toggleDeafBtn.innerHTML = isDeaf
      ? '<i class="bi bi-ear me-1"></i>Undeaf'
      : '<i class="bi bi-ear-fill me-1"></i>Deaf';
    DOM.toggleDeafBtn.className = isDeaf
      ? 'btn btn-danger btn-sm'
      : 'btn btn-outline-primary btn-sm';
  };

  DOM.toggleDeafBtn.onclick = async () => {
    try {
      await self.toggleDeaf();
      updateDeafBtn();
    } catch (error) {
      console.error('Error toggling deaf:', error);
    }
  };

  callSubscriptions.push(self.deaf$.subscribe(() => updateDeafBtn()));

  // --- Hand Raise ---
  const updateHandRaiseBtn = () => {
    const raised = self.handraised;
    DOM.toggleHandRaiseBtn.innerHTML = raised
      ? '<i class="bi bi-hand-index me-1"></i>Lower Hand'
      : '<i class="bi bi-hand-index-fill me-1"></i>Raise Hand';
    DOM.toggleHandRaiseBtn.className = raised
      ? 'btn btn-warning btn-sm'
      : 'btn btn-outline-primary btn-sm';
  };

  DOM.toggleHandRaiseBtn.onclick = async () => {
    try {
      await self.toggleHandraise();
      updateHandRaiseBtn();
    } catch (error) {
      console.error('Error toggling hand raise:', error);
    }
  };

  callSubscriptions.push(self.handraised$.subscribe(() => updateHandRaiseBtn()));

  // --- Screen Share ---
  // v3: roomObj.startScreenShare({ audio, video, positions, layout })
  // v4: self.startScreenShare() / self.stopScreenShare()
  const updateScreenShareBtn = () => {
    const isSharing = self.screenShareStatus === 'started';
    DOM.screenShareBtn.innerHTML = isSharing
      ? '<i class="bi bi-display me-1"></i>Stop Screen Share'
      : '<i class="bi bi-display me-1"></i>Start Screen Share';
    DOM.screenShareBtn.className = isSharing
      ? 'btn btn-warning btn-sm'
      : 'btn btn-outline-info btn-sm';
  };

  DOM.screenShareBtn.onclick = async () => {
    try {
      if (self.screenShareStatus === 'started') {
        await self.stopScreenShare();
      } else {
        await self.startScreenShare();
      }
      updateScreenShareBtn();
    } catch (error) {
      console.error('Error toggling screen share:', error);
      alert('Error toggling screen share: ' + error.message);
    }
  };

  callSubscriptions.push(self.screenShareStatus$.subscribe(() => updateScreenShareBtn()));

  // --- Echo Cancellation ---
  const updateEchoCancelBtn = () => {
    const enabled = self.echoCancellation;
    DOM.toggleEchoCancelBtn.textContent = `Echo Cancel: ${enabled ? 'ON' : 'OFF'}`;
    DOM.toggleEchoCancelBtn.className = enabled
      ? 'btn btn-success btn-sm'
      : 'btn btn-outline-secondary btn-sm';
  };

  DOM.toggleEchoCancelBtn.onclick = async () => {
    try {
      await self.toggleEchoCancellation();
      updateEchoCancelBtn();
    } catch (error) {
      console.error('Error toggling echo cancellation:', error);
    }
  };

  callSubscriptions.push(self.echoCancellation$.subscribe(() => updateEchoCancelBtn()));

  // --- Auto Gain ---
  const updateAutoGainBtn = () => {
    const enabled = self.autoGain;
    DOM.toggleAutoGainBtn.textContent = `Auto Gain: ${enabled ? 'ON' : 'OFF'}`;
    DOM.toggleAutoGainBtn.className = enabled
      ? 'btn btn-success btn-sm'
      : 'btn btn-outline-secondary btn-sm';
  };

  DOM.toggleAutoGainBtn.onclick = async () => {
    try {
      await self.toggleAudioInputAutoGain();
      updateAutoGainBtn();
    } catch (error) {
      console.error('Error toggling auto gain:', error);
    }
  };

  callSubscriptions.push(self.autoGain$.subscribe(() => updateAutoGainBtn()));

  // --- Noise Suppression ---
  const updateNoiseSuppressionBtn = () => {
    const enabled = self.noiseSuppression;
    DOM.toggleNoiseSuppressionBtn.textContent = `Noise Supp.: ${enabled ? 'ON' : 'OFF'}`;
    DOM.toggleNoiseSuppressionBtn.className = enabled
      ? 'btn btn-success btn-sm'
      : 'btn btn-outline-secondary btn-sm';
  };

  DOM.toggleNoiseSuppressionBtn.onclick = async () => {
    try {
      await self.toggleNoiseSuppression();
      updateNoiseSuppressionBtn();
    } catch (error) {
      console.error('Error toggling noise suppression:', error);
    }
  };

  callSubscriptions.push(self.noiseSuppression$.subscribe(() => updateNoiseSuppressionBtn()));

  // --- Volume Controls ---
  // v3: roomObj.setMicrophoneVolume({ volume }), roomObj.setSpeakerVolume({ volume }),
  //     roomObj.setInputSensitivity({ value })
  // v4: self.setAudioInputVolume(value), self.setAudioOutputVolume(value),
  //     self.setAudioInputSensitivity(value)

  DOM.micVolumeSlider.oninput = () => {
    DOM.micVolumeValue.textContent = DOM.micVolumeSlider.value;
  };
  DOM.micVolumeSlider.onchange = async () => {
    try {
      await self.setAudioInputVolume(parseInt(DOM.micVolumeSlider.value, 10));
    } catch (error) {
      console.error('Error setting mic volume:', error);
    }
  };

  DOM.speakerVolumeSlider.oninput = () => {
    DOM.speakerVolumeValue.textContent = DOM.speakerVolumeSlider.value;
  };
  DOM.speakerVolumeSlider.onchange = async () => {
    try {
      await self.setAudioOutputVolume(parseInt(DOM.speakerVolumeSlider.value, 10));
    } catch (error) {
      console.error('Error setting speaker volume:', error);
    }
  };

  DOM.inputSensitivitySlider.oninput = () => {
    DOM.inputSensitivityValue.textContent = DOM.inputSensitivitySlider.value;
  };
  DOM.inputSensitivitySlider.onchange = async () => {
    try {
      await self.setAudioInputSensitivity(parseInt(DOM.inputSensitivitySlider.value, 10));
    } catch (error) {
      console.error('Error setting input sensitivity:', error);
    }
  };

  // Subscribe to volume observables for reactive UI updates
  callSubscriptions.push(
    self.inputVolume$.subscribe((volume) => {
      if (volume !== undefined) {
        DOM.micVolumeSlider.value = volume;
        DOM.micVolumeValue.textContent = volume;
      }
    })
  );

  callSubscriptions.push(
    self.outputVolume$.subscribe((volume) => {
      if (volume !== undefined) {
        DOM.speakerVolumeSlider.value = volume;
        DOM.speakerVolumeValue.textContent = volume;
      }
    })
  );

  callSubscriptions.push(
    self.inputSensitivity$.subscribe((sensitivity) => {
      if (sensitivity !== undefined) {
        DOM.inputSensitivitySlider.value = sensitivity;
        DOM.inputSensitivityValue.textContent = sensitivity;
      }
    })
  );
}

/**
 * Set up device selection change handlers
 *
 * Migration note:
 * v3: roomObj.updateMicrophone({ deviceId }), roomObj.updateCamera({ deviceId }),
 *     roomObj.updateSpeaker({ deviceId })
 * v4: self.selectAudioInputDevice(deviceInfo), self.selectVideoInputDevice(deviceInfo),
 *     self.selectAudioOutputDevice(deviceInfo)
 *     Note: v4 takes the full MediaDeviceInfo object, not just deviceId
 */
function setupDeviceSelectionHandlers(self) {
  DOM.audioInputSelect.onchange = () => {
    const deviceId = DOM.audioInputSelect.value;
    if (!deviceId) return;
    const device = currentAudioInputDevices.find((d) => d.deviceId === deviceId);
    if (device) {
      try {
        self.selectAudioInputDevice(device);
      } catch (error) {
        console.error('Error selecting audio input:', error);
      }
    }
  };

  DOM.videoInputSelect.onchange = () => {
    const deviceId = DOM.videoInputSelect.value;
    if (!deviceId) return;
    const device = currentVideoInputDevices.find((d) => d.deviceId === deviceId);
    if (device) {
      try {
        self.selectVideoInputDevice(device);
      } catch (error) {
        console.error('Error selecting video input:', error);
      }
    }
  };

  // v3: roomObj.updateSpeaker({ deviceId })
  // v4: self.selectAudioOutputDevice(device)
  DOM.audioOutputSelect.onchange = () => {
    const deviceId = DOM.audioOutputSelect.value;
    if (!deviceId) return;
    const device = currentAudioOutputDevices.find((d) => d.deviceId === deviceId);
    if (device) {
      try {
        self.selectAudioOutputDevice(device);
      } catch (error) {
        console.error('Error selecting audio output:', error);
      }
    }
  };
}

// ============================================================
// PARTICIPANTS
//
// Migration note:
// v3: roomObj.on('member.joined', handler), roomObj.on('member.updated', handler)
//     Member data comes as flat objects with properties
//
// v4: call.participants$ emits full array on every change
//     Each participant has individual observables:
//     - participant.name$, participant.audioMuted$, participant.videoMuted$
//     - participant.isTalking$, participant.handraised$, participant.deaf$
//     - participant.visible$, participant.position$, etc.
// ============================================================

/** Render a participant list item from the template */
function renderParticipant(participant) {
  const template = DOM.participantItemTemplate.content.cloneNode(true);
  const item = template.querySelector('.participant-item');
  item.dataset.participantId = participant.id;
  return item;
}

/** Subscribe to individual participant observables and update their UI element */
function subscribeToParticipantObservables(participant, element) {
  const nameEl = element.querySelector('.participant-name');
  const typeEl = element.querySelector('.participant-type');
  const talkingEl = element.querySelector('.participant-talking');
  const handraisedEl = element.querySelector('.participant-handraised');
  const audioEl = element.querySelector('.participant-audio');
  const videoEl = element.querySelector('.participant-video');
  const visibleEl = element.querySelector('.participant-visible');
  const deafEl = element.querySelector('.participant-deaf');
  const positionEl = element.querySelector('.participant-position');
  const layerEl = element.querySelector('.participant-layer');
  const detailsEl = element.querySelector('.participant-details');

  // All participant subscriptions are tracked for cleanup
  callSubscriptions.push(
    participant.name$.subscribe((name) => {
      nameEl.textContent = name || 'Unknown';
    })
  );

  callSubscriptions.push(
    participant.type$.subscribe((type) => {
      typeEl.textContent = type || '--';
    })
  );

  callSubscriptions.push(
    participant.audioMuted$.subscribe((muted) => {
      audioEl.className = `participant-audio badge ${muted ? 'bg-danger' : 'bg-success'}`;
      audioEl.title = muted ? 'Audio Muted' : 'Audio Active';
    })
  );

  callSubscriptions.push(
    participant.videoMuted$.subscribe((muted) => {
      videoEl.className = `participant-video badge ${muted ? 'bg-danger' : 'bg-success'}`;
      videoEl.title = muted ? 'Video Off' : 'Video On';
    })
  );

  callSubscriptions.push(
    participant.isTalking$.subscribe((talking) => {
      talkingEl.classList.toggle('d-none', !talking);
    })
  );

  callSubscriptions.push(
    participant.handraised$.subscribe((raised) => {
      handraisedEl.classList.toggle('d-none', !raised);
    })
  );

  callSubscriptions.push(
    participant.visible$.subscribe((visible) => {
      visibleEl.textContent = visible ? 'Yes' : 'No';
      detailsEl.classList.remove('d-none');
    })
  );

  callSubscriptions.push(
    participant.deaf$.subscribe((deaf) => {
      deafEl.textContent = deaf ? 'Yes' : 'No';
    })
  );

  callSubscriptions.push(
    participant.position$.subscribe((position) => {
      if (position) {
        positionEl.textContent = position.position || 'N/A';
        layerEl.textContent = position.layer_index?.toString() || 'N/A';
      }
    })
  );
}

// ============================================================
// MESSAGING
//
// Migration note:
// v3: client.conversation.sendMessage({ addressId, text })
//     client.conversation.subscribe((newMsg) => { ... })
//     client.conversation.getConversationMessages({ addressId, pageSize })
//
// v4: callAddress.sendText(text) — sends message to call's address
//     callAddress.textMessages$ — observable of TextMessagesCollection
//     textMessagesCollection.values$ — observable of TextMessage[]
//     textMessagesCollection.hasMore$ / loadMore() for pagination
// ============================================================

function setupMessaging(call) {
  currentCallAddress = call.address;

  if (!currentCallAddress) {
    return;
  }

  // Enable messaging UI
  DOM.messageInput.disabled = false;
  DOM.sendMessageBtn.disabled = false;

  // Send message handler
  const sendMessage = async () => {
    const text = DOM.messageInput.value.trim();
    if (!text || !currentCallAddress) return;

    try {
      await currentCallAddress.sendText(text);
      DOM.messageInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

  DOM.sendMessageBtn.onclick = sendMessage;
  DOM.messageInput.onkeydown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  // Subscribe to text messages
  callSubscriptions.push(
    currentCallAddress.textMessages$.subscribe((textMessagesCollection) => {
      if (!textMessagesCollection) {
        return;
      }

      DOM.messagesContainer.innerHTML = '';

      // Clean up previous messages subscription
      if (messagesSubscription) {
        messagesSubscription.unsubscribe();
      }

      // Subscribe to the values$ observable for real-time updates
      messagesSubscription = textMessagesCollection.values$.subscribe((messages) => {
        DOM.messagesContainer.innerHTML = '';

        if (messages.length === 0) {
          DOM.messagesContainer.innerHTML =
            '<p class="text-muted small text-center">No messages yet</p>';
          return;
        }

        messages.forEach((message) => {
          renderMessage(message, DOM.messagesContainer);
        });
      });

      // Infinite scroll for loading older messages
      callSubscriptions.push(textMessagesCollection.hasMore$.subscribe((hasMore) => {
        if (hasMore) {
          DOM.messagesContainer.onscroll = () => {
            if (DOM.messagesContainer.scrollTop < 50) {
              textMessagesCollection.loadMore();
            }
          };
        } else {
          DOM.messagesContainer.onscroll = null;
        }
      }));
    })
  );
}

/** Render a single message from the template */
function renderMessage(message, container) {
  const template = DOM.messageItemTemplate.content.cloneNode(true);
  const textEl = template.querySelector('.message-text');
  const senderEl = template.querySelector('.message-sender');

  textEl.textContent = message.text;
  senderEl.textContent = 'Loading sender...';

  // Subscribe to the fromAddress$ to get sender info (take(1) since sender doesn't change)
  callSubscriptions.push(
    message.fromAddress$.pipe(take(1)).subscribe((address) => {
      if (address) {
        senderEl.textContent = address.displayName || 'Unknown';
      }
    })
  );

  container.appendChild(template);
  container.scrollTop = container.scrollHeight;
}

// ============================================================
// INBOUND CALLS
//
// Migration note:
// v3: await client.online({ incomingCallHandlers: { all: handler } })
//     handler(invite) — invite.accept({ rootElement }) / invite.reject()
//     await client.offline() to stop listening
//
// v4: client.session.incomingCalls$ observable
//     Emits Call[] array of incoming calls
//     Filter by status === 'ringing' to find pending calls
//     call.answer() / call.reject() methods
//     Always active after connection — no online/offline toggle
// ============================================================

function subscribeToIncomingCalls() {
  client.session.incomingCalls$.subscribe((incomingCalls) => {
    const ringingCalls = incomingCalls.filter((c) => c.status === 'ringing');

    if (ringingCalls.length > 0 && !currentRingingCall) {
      // Show modal for the first ringing call
      const ringingCall = ringingCalls[0];
      showIncomingCallModal(ringingCall);

      // Auto-hide when call is no longer ringing
      ringingCall.status$
        .pipe(filter((status) => status !== 'ringing'))
        .subscribe(() => {
          if (currentRingingCall?.id === ringingCall.id) {
            hideIncomingCallModal();
          }
        });
    } else if (ringingCalls.length === 0 && currentRingingCall) {
      hideIncomingCallModal();
    }
  });

  // Accept button
  DOM.acceptCallBtn.onclick = () => {
    if (currentRingingCall) {
      currentRingingCall.answer();

      currentCall = currentRingingCall;
      subscribeToCallObservables(currentCall);
      hideIncomingCallModal();
    }
  };

  // Reject button
  DOM.rejectCallBtn.onclick = () => {
    if (currentRingingCall) {
      currentRingingCall.reject();
      hideIncomingCallModal();
    }
  };
}

function showIncomingCallModal(call) {
  currentRingingCall = call;

  const callerName = call.fromName || 'Unknown Caller';
  const callerAddress = call.from || call.to || 'Unknown';

  DOM.incomingCallerName.textContent = callerName;
  DOM.incomingCallerAddress.textContent = callerAddress;
  DOM.incomingCallModal.classList.remove('d-none');
}

function hideIncomingCallModal() {
  DOM.incomingCallModal.classList.add('d-none');
  currentRingingCall = null;
}

// ============================================================
// CALL LIFECYCLE HELPERS
// ============================================================

/** Clean up all tracked call subscriptions */
function cleanupCallSubscriptions() {
  callSubscriptions.forEach((sub) => sub.unsubscribe());
  callSubscriptions = [];

  if (messagesSubscription) {
    messagesSubscription.unsubscribe();
    messagesSubscription = null;
  }
}

function onCallEnded() {
  // Clean up all subscriptions
  cleanupCallSubscriptions();

  // Hide call-related UI cards
  DOM.callControlsCard.classList.add('d-none');
  DOM.deviceSelectionCard.classList.add('d-none');
  DOM.participantsCard.classList.add('d-none');
  DOM.hangupBtn.disabled = true;

  // Reset video components — clearing .call on the provider disconnects all child components
  DOM.callProvider.call = null;

  // Reset messaging
  DOM.messageInput.disabled = true;
  DOM.sendMessageBtn.disabled = true;
  DOM.messagesContainer.innerHTML =
    '<p class="text-muted small text-center">No messages yet. Start a call to send messages.</p>';
  currentCallAddress = null;

  // Reset call state
  currentCall = null;
  isHolding = false;

  // Reset call info
  DOM.callStatusText.textContent = '--';
  DOM.callDirectionText.textContent = '--';
  DOM.callRecordingText.textContent = '--';
  DOM.callStreamingText.textContent = '--';
  DOM.callLockedText.textContent = '--';
  DOM.callHandPriorityText.textContent = '--';
  DOM.audioDirectionText.textContent = '--';
  DOM.videoDirectionText.textContent = '--';
  DOM.capabilitiesContainer.innerHTML = '<span class="text-muted small">--</span>';
  DOM.callMetaDisplay.textContent = '--';
  DOM.currentLayout.textContent = '--';
  DOM.participantsList.innerHTML = '<p class="text-muted small text-center py-3">No participants</p>';
  DOM.participantCount.textContent = '0';

  // Reset hold button
  DOM.holdBtn.innerHTML = '<i class="bi bi-pause-circle me-1"></i>Hold';
  DOM.holdBtn.className = 'btn btn-outline-warning btn-sm';
}

function getStatusClass(status) {
  switch (status) {
    case 'connected': return 'text-end text-success fw-bold';
    case 'destroyed':
    case 'disconnecting': return 'text-end text-danger fw-bold';
    default: return 'text-end text-warning fw-bold';
  }
}

// ============================================================
// CONNECTION STATE & DIAL HANDLER
//
// Migration note:
// v3: Connection is established by the async SignalWire() factory
//     No explicit connection observable
//
// v4: client.isConnected$ observable — reactive connection state
//     Connection is automatic on first observable subscription
// ============================================================

function setupDialHandler() {
  DOM.dialBtn.onclick = async () => {
    const destination = DOM.destinationInput.value.trim();
    if (!destination) {
      alert('Please enter a destination address.');
      return;
    }

    try {
      /*
       * Migration note:
       * v3: const call = await client.dial({
       *       to: destination,
       *       rootElement: document.getElementById('rootElement'),
       *       nodeId: steeringId,
       *       userVariables: { ... }
       *     })
       *     await call.start()
       *
       * v4: const call = await client.dial(destination)
       *     - No rootElement needed (use localStream$/remoteStream$ instead)
       *     - No nodeId (SDK handles routing internally)
       *     - No separate start() call needed
       */
      currentCall = await client.dial(destination);
      if (currentCall) {
        subscribeToCallObservables(currentCall);
      }
    } catch (error) {
      console.error('Error making call:', error);
      alert('Error making call: ' + error.message);
    }
  };
}

function setupConnectionObservables() {
  client.isConnected$.subscribe((isConnected) => {
    if (isConnected) {
      DOM.connectionStatus.textContent = 'Connected';
      DOM.connectionStatus.className = 'badge bg-success';

      DOM.availabilityBadge.textContent = 'Available (Listening for calls)';
      DOM.availabilityBadge.className = 'badge bg-success';

      // Show user info (using safe rendering)
      const sub = client.user;
      if (sub) {
        renderUserInfo(sub.id, sub.email);
      }

      // Enable dial button
      DOM.dialBtn.disabled = false;

      // Subscribe to directory (only once, guarded against reconnect)
      if (!directoryInitialized) {
        subscribeToDirectory();
        directoryInitialized = true;
      }

      // Subscribe to incoming calls (only once, guarded against reconnect)
      if (!incomingCallsInitialized) {
        subscribeToIncomingCalls();
        incomingCallsInitialized = true;
      }
    } else {
      DOM.connectionStatus.textContent = 'Disconnected';
      DOM.connectionStatus.className = 'badge bg-danger';

      DOM.availabilityBadge.textContent = 'Offline';
      DOM.availabilityBadge.className = 'badge bg-secondary';

      DOM.dialBtn.disabled = true;
    }
  });

  // Subscribe to user profile updates (safe rendering)
  client.user$.subscribe({
    next: (user) => {
      if (user) {
        renderUserInfo(user.id, user.email);
      }
    },
    error: (error) => {
      console.error('Error with user:', error);
      DOM.connectionStatus.textContent = 'Error';
      DOM.connectionStatus.className = 'badge bg-danger';
      DOM.userInfo.textContent = 'Authentication error: ' + error.message;
    },
  });
}

// ============================================================
// BOOT — Authentication Flow (CredentialProvider pattern)
//
// Instead of obtaining a raw token and wrapping it in a
// StaticCredentialProvider, each auth method now has its own
// CredentialProvider implementation. The SDK calls authenticate()
// on the provider during connection — and refresh() (if provided)
// before the token expires.
//
// Checks auth state in this order:
// 1. Stored user token → StaticCredentialProvider (reuse)
// 2. Build-time SAT_TOKEN → StaticCredentialProvider
// 3. Show auth screen → user chooses User sign-in
// ============================================================

async function boot() {
  // Set up auth screen event handlers (always needed for sign-out)
  setupAuthScreen();

  // 1. Stored user token → reuse with StaticCredentialProvider
  const storedToken = getStoredToken();
  const storedMethod = getStoredAuthMethod();
  if (storedToken && storedMethod) {
    const provider = new StaticCredentialProvider({ token: storedToken });
    initializeApp(provider, storedMethod);
    return;
  }

  // 2. Build-time SAT_TOKEN → StaticCredentialProvider
  //    (Preserves the original dev workflow: npm run dev auto-connects)
  if (buildTimeToken) {
    storeToken(buildTimeToken, AUTH_METHODS.BUILD_TIME);
    const provider = new StaticCredentialProvider({ token: buildTimeToken });
    initializeApp(provider, AUTH_METHODS.BUILD_TIME);
    return;
  }

  // 3. No token available — show the auth screen
  showAuthScreen();
}

// Start the boot sequence
boot();
