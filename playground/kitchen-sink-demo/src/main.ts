import { filter, type Subscription } from 'rxjs';
import './style.css';
import {
  StaticCredentialProvider,
  SignalWire,
  type Call,
  type CallError,
  type CallParticipant,
  type CallAddress,
  type Address,
  type TextMessage,
  // Resilience feature types — used by the Network Quality and Recovery UI sections
  type CallNetworkIssue,
  type CallNetworkMetrics,
  type RecoveryEvent,
  type RecoveryState,
  type QualityLevel,
  type DeviceRecoveryEvent,
  type PlatformCapabilities,
  type SessionDiagnostics,
  MediaAccessError
} from '@signalwire/js';
import { UserCredentialProvider } from './UserCredentialProvider';
import {
  AUTH_METHODS,
  type AuthMethod,
  storeToken,
  clearToken,
  persistToken,
  getPersistedToken,
  getPersistedAuthMethod,
  clearPersistedToken,
  storeLastDestination,
  getLastDestination,
  clearLastDestination,
  setAutoConnect,
  getAutoConnect,
  clearAllPersisted
} from './auth';

// Token configuration (injected by Vite define from root .env)
//@ts-expect-error SAT_TOKEN is injected by vite config
const buildTimeToken: string | null = typeof SAT_TOKEN !== 'undefined' ? SAT_TOKEN : null;

// ============================================================
// THEME CONSTANTS
// ============================================================
const THEME_STORAGE_KEY = 'ks_theme';
const TOAST_AUTO_DISMISS_MS = 5000;

// ============================================================
// DOM REFERENCES
// ============================================================
const DOM = {
  // Auth Modal
  authModal: document.querySelector<HTMLDivElement>('#authModal')!,
  authTabButtons: document.querySelectorAll<HTMLButtonElement>('.auth-tab-btn'),
  tabToken: document.querySelector<HTMLDivElement>('#tabToken')!,
  tabUser: document.querySelector<HTMLDivElement>('#tabUser')!,
  tokenInput: document.querySelector<HTMLInputElement>('#tokenInput')!,
  tokenSignInBtn: document.querySelector<HTMLButtonElement>('#tokenSignInBtn')!,
  rememberMeCheckbox: document.querySelector<HTMLInputElement>('#rememberMeCheckbox')!,
  autoConnectCheckbox: document.querySelector<HTMLInputElement>('#autoConnectCheckbox')!,
  clearSavedBtn: document.querySelector<HTMLButtonElement>('#clearSavedBtn')!,
  userForm: document.querySelector<HTMLFormElement>('#userForm')!,
  userRef: document.querySelector<HTMLInputElement>('#userRef')!,
  userPass: document.querySelector<HTMLInputElement>('#userPass')!,
  authError: document.querySelector<HTMLDivElement>('#authError')!,
  authLoading: document.querySelector<HTMLDivElement>('#authLoading')!,
  authMethodBadge: document.querySelector<HTMLSpanElement>('#authMethodBadge')!,
  signOutBtn: document.querySelector<HTMLButtonElement>('#signOutBtn')!,
  // Theme
  themeToggle: document.querySelector<HTMLButtonElement>('#themeToggle')!,
  themeIconSun: document.querySelector<SVGElement>('#themeIconSun')!,
  themeIconMoon: document.querySelector<SVGElement>('#themeIconMoon')!,
  // Main App
  statusElement: document.querySelector<HTMLSpanElement>('#status')!,
  connectionDot: document.querySelector<HTMLSpanElement>('#connectionDot')!,
  clientInfoElement: document.querySelector<HTMLDivElement>('#client-info')!,
  audioOutputDeviceSelect: document.querySelector<HTMLSelectElement>('#audioOutputDeviceSelect')!,
  callButton: document.querySelector<HTMLButtonElement>('#callButton')!,
  hangupButton: document.querySelector<HTMLButtonElement>('#hangupButton')!,
  toAddressInput: document.querySelector<HTMLInputElement>('#toAddress')!,
  sendAudioToggle: document.querySelector<HTMLInputElement>('#sendAudioToggle')!,
  sendVideoToggle: document.querySelector<HTMLInputElement>('#sendVideoToggle')!,
  callStateCard: document.querySelector<HTMLDivElement>('#callStateCard')!,
  participantsCard: document.querySelector<HTMLDivElement>('#participantsCard')!,
  selfControlsCard: document.querySelector<HTMLDivElement>('#selfControlsCard')!,
  callStatus: document.querySelector<HTMLParagraphElement>('#callStatus')!,
  floatingCallStatus: document.querySelector<HTMLDivElement>('#floatingCallStatus')!,
  floatingCallStatusText: document.querySelector<HTMLParagraphElement>('#floatingCallStatusText')!,
  statusIndicator: document.querySelector<HTMLDivElement>('#statusIndicator')!,
  callDirection: document.querySelector<HTMLParagraphElement>('#callDirection')!,
  callRecording: document.querySelector<HTMLParagraphElement>('#callRecording')!,
  callStreaming: document.querySelector<HTMLParagraphElement>('#callStreaming')!,
  callLocked: document.querySelector<HTMLParagraphElement>('#callLocked')!,
  callRaiseHandPriority: document.querySelector<HTMLParagraphElement>('#callRaiseHandPriority')!,
  mediaAudio: document.querySelector<HTMLParagraphElement>('#mediaAudio')!,
  mediaVideo: document.querySelector<HTMLParagraphElement>('#mediaVideo')!,
  callCapabilities: document.querySelector<HTMLDivElement>('#callCapabilities')!,
  callMeta: document.querySelector<HTMLPreElement>('#callMeta')!,
  callLayout: document.querySelector<HTMLParagraphElement>('#callLayout')!,
  callLayouts: document.querySelector<HTMLDivElement>('#callLayouts')!,
  participantsList: document.querySelector<HTMLDivElement>('#participantsList')!,
  localVideo: document.querySelector<HTMLVideoElement>('#localVideo')!,
  remoteVideo: document.querySelector<HTMLVideoElement>('#remoteVideo')!,
  participantTemplate: document.querySelector<HTMLTemplateElement>('#participantTemplate')!,
  deviceItemTemplate: document.querySelector<HTMLTemplateElement>('#deviceItemTemplate')!,
  // Self participant controls
  toggleAudioButton: document.querySelector<HTMLButtonElement>('#toggleAudioButton')!,
  toggleVideoButton: document.querySelector<HTMLButtonElement>('#toggleVideoButton')!,
  screenShareButton: document.querySelector<HTMLButtonElement>('#screenShareButton')!,
  toggleDeafButton: document.querySelector<HTMLButtonElement>('#toggleDeafButton')!,
  toggleHandRaiseButton: document.querySelector<HTMLButtonElement>('#toggleHandRaiseButton')!,
  inputVolumeSlider: document.querySelector<HTMLInputElement>('#inputVolumeSlider')!,
  inputVolumeValue: document.querySelector<HTMLSpanElement>('#inputVolumeValue')!,
  outputVolumeSlider: document.querySelector<HTMLInputElement>('#outputVolumeSlider')!,
  outputVolumeValue: document.querySelector<HTMLSpanElement>('#outputVolumeValue')!,
  inputSensitivitySlider: document.querySelector<HTMLInputElement>('#inputSensitivitySlider')!,
  inputSensitivityValue: document.querySelector<HTMLSpanElement>('#inputSensitivityValue')!,
  toggleEchoCancellationButton: document.querySelector<HTMLButtonElement>(
    '#toggleEchoCancellationButton'
  )!,
  toggleAutoGainButton: document.querySelector<HTMLButtonElement>('#toggleAutoGainButton')!,
  toggleNoiseSuppressionButton: document.querySelector<HTMLButtonElement>(
    '#toggleNoiseSuppressionButton'
  )!,
  removeSelfButton: document.querySelector<HTMLButtonElement>('#removeSelfButton')!,
  endCallButton: document.querySelector<HTMLButtonElement>('#endCallButton')!,
  // Device selection
  audioInputDeviceSelect: document.querySelector<HTMLSelectElement>('#audioInputDeviceSelect')!,
  videoInputDeviceSelect: document.querySelector<HTMLSelectElement>('#videoInputDeviceSelect')!,
  // Addresses
  addressesContainer: document.querySelector<HTMLDivElement>('#addressesContainer')!,
  loadMoreContainer: document.querySelector<HTMLDivElement>('#loadMoreContainer')!,
  loadMoreAddressesButton: document.querySelector<HTMLButtonElement>('#loadMoreAddressesButton')!,
  loadMoreText: document.querySelector<HTMLSpanElement>('#loadMoreText')!,
  loadMoreSpinner: document.querySelector<SVGElement>('#loadMoreSpinner')!,
  addressCount: document.querySelector<HTMLSpanElement>('#addressCount')!,
  addressCardTemplate: document.querySelector<HTMLTemplateElement>('#addressCardTemplate')!,
  // Incoming call modal
  incomingCallModal: document.querySelector<HTMLDivElement>('#incomingCallModal')!,
  incomingCallInitials: document.querySelector<HTMLSpanElement>('#incomingCallInitials')!,
  incomingCallName: document.querySelector<HTMLHeadingElement>('#incomingCallName')!,
  incomingCallAddress: document.querySelector<HTMLParagraphElement>('#incomingCallAddress')!,
  incomingCallMediaOptions: document.querySelector<HTMLDivElement>('#incomingCallMediaOptions')!,
  incomingAudioToggle: document.querySelector<HTMLInputElement>('#incomingAudioToggle')!,
  incomingVideoToggle: document.querySelector<HTMLInputElement>('#incomingVideoToggle')!,
  incomingAudioLabel: document.querySelector<HTMLLabelElement>('#incomingAudioLabel')!,
  incomingVideoLabel: document.querySelector<HTMLLabelElement>('#incomingVideoLabel')!,
  acceptCallButton: document.querySelector<HTMLButtonElement>('#acceptCallButton')!,
  rejectCallButton: document.querySelector<HTMLButtonElement>('#rejectCallButton')!,
  // Messages
  messagesCard: document.querySelector<HTMLDivElement>('#messagesCard')!,
  messagesContainer: document.querySelector<HTMLDivElement>('#messagesContainer')!,
  messageInput: document.querySelector<HTMLInputElement>('#messageInput')!,
  sendMessageButton: document.querySelector<HTMLButtonElement>('#sendMessageButton')!,
  // Dialpad
  dialpadCard: document.querySelector<HTMLDivElement>('#dialpadCard')!,
  dialpadInput: document.querySelector<HTMLInputElement>('#dialpadInput')!,
  dialpadDigitButtons: document.querySelectorAll<HTMLButtonElement>('.dialpad-digit')!,
  dialpadSendButton: document.querySelector<HTMLButtonElement>('#dialpadSendButton')!,
  dialpadSendText: document.querySelector<HTMLSpanElement>('#dialpadSendText')!,
  dialpadSpinner: document.querySelector<SVGElement>('#dialpadSpinner')!,
  dialpadErrorButton: document.querySelector<HTMLButtonElement>('#dialpadErrorButton')!,
  dialpadErrorMessage: document.querySelector<HTMLDivElement>('#dialpadErrorMessage')!,
  dialpadErrorText: document.querySelector<HTMLParagraphElement>('#dialpadErrorText')!,
  // Network Quality
  networkQualityCard: document.querySelector<HTMLDivElement>('#networkQualityCard')!,
  mosScore: document.querySelector<HTMLParagraphElement>('#mosScore')!,
  qualityLevelBadge: document.querySelector<HTMLSpanElement>('#qualityLevelBadge')!,
  networkHealthDot: document.querySelector<HTMLSpanElement>('#networkHealthDot')!,
  networkHealthText: document.querySelector<HTMLSpanElement>('#networkHealthText')!,
  recoveryStateBadge: document.querySelector<HTMLSpanElement>('#recoveryStateBadge')!,
  bandwidthConstrainedBanner: document.querySelector<HTMLDivElement>(
    '#bandwidthConstrainedBanner'
  )!,
  networkIssuesList: document.querySelector<HTMLDivElement>('#networkIssuesList')!,
  // Live Stats table cells
  statRtt: document.querySelector<HTMLTableCellElement>('#statRtt')!,
  statAudioJitter: document.querySelector<HTMLTableCellElement>('#statAudioJitter')!,
  statAudioPackets: document.querySelector<HTMLTableCellElement>('#statAudioPackets')!,
  statVideoPackets: document.querySelector<HTMLTableCellElement>('#statVideoPackets')!,
  statPacketLoss: document.querySelector<HTMLTableCellElement>('#statPacketLoss')!,
  statBitrate: document.querySelector<HTMLTableCellElement>('#statBitrate')!,
  // Recovery & Events
  recoveryEventsCard: document.querySelector<HTMLDivElement>('#recoveryEventsCard')!,
  requestKeyframeBtn: document.querySelector<HTMLButtonElement>('#requestKeyframeBtn')!,
  requestKeyframeText: document.querySelector<HTMLSpanElement>('#requestKeyframeText')!,
  requestIceRestartBtn: document.querySelector<HTMLButtonElement>('#requestIceRestartBtn')!,
  requestIceRestartText: document.querySelector<HTMLSpanElement>('#requestIceRestartText')!,
  recoveryEventLog: document.querySelector<HTMLDivElement>('#recoveryEventLog')!,
  // Platform & Diagnostics
  platformCapabilitiesGrid: document.querySelector<HTMLDivElement>('#platformCapabilitiesGrid')!,
  supportedCodecs: document.querySelector<HTMLDivElement>('#supportedCodecs')!,
  liveEventFeed: document.querySelector<HTMLDivElement>('#liveEventFeed')!,
  exportDiagnosticsBtn: document.querySelector<HTMLButtonElement>('#exportDiagnosticsBtn')!,
  diagnosticsOutput: document.querySelector<HTMLDivElement>('#diagnosticsOutput')!,
  collapseDiagnosticsBtn: document.querySelector<HTMLButtonElement>('#collapseDiagnosticsBtn')!,
  diagnosticsJson: document.querySelector<HTMLPreElement>('#diagnosticsJson')!,
  // Quality Overlay (on video)
  qualityOverlay: document.querySelector<HTMLDivElement>('#qualityOverlay')!,
  qualityDot: document.querySelector<HTMLSpanElement>('#qualityDot')!,
  qualityScoreDisplay: document.querySelector<HTMLSpanElement>('#qualityScoreDisplay')!,
  qualityLevelDisplay: document.querySelector<HTMLSpanElement>('#qualityLevelDisplay')!,
  // Tab panel
  tabNav: document.querySelectorAll<HTMLButtonElement>('.tab-nav .tab'),
  tabContents: document.querySelectorAll<HTMLDivElement>('.tab-content'),
  // Toast container
  toastContainer: document.querySelector<HTMLDivElement>('#toastContainer')!,
  // Hangup ctrl bar button (wired to same logic as hangupButton)
  hangupCtrlBtn: document.querySelector<HTMLButtonElement>('#hangupCtrlBtn')!
} as const;

// Client is initialized after authentication
let client: InstanceType<typeof SignalWire> | null = null;

let call: Call | null = null;

// ============================================================
// DEBUG LOG — captures everything needed to diagnose call issues.
// Lightweight: no per-second stats noise. Stats snapshot added on export.
// ============================================================

interface DebugEntry {
  t: string; // ISO timestamp
  cat: string; // category: call, error, recovery, device, connection, media
  msg: string; // human-readable description
  data?: Record<string, unknown>; // optional structured data
}

const MAX_ENTRIES_PER_CALL = 500;
const MAX_CALLS_KEPT = 3;

interface CallDebugSession {
  callId: string;
  direction: string;
  destination?: string;
  startedAt: string;
  endedAt?: string;
  lastStats: CallNetworkMetrics | null;
  events: DebugEntry[];
}

// Archive of previous call sessions (most recent first, capped at MAX_CALLS_KEPT)
const callArchive: CallDebugSession[] = [];

// Current active call session (null when no call)
let activeCallSession: CallDebugSession | null = null;

// Connection-level events (not tied to a specific call)
const connectionLog: DebugEntry[] = [];

const MAX_FEED_ENTRIES = 100;

const CAT_COLORS: Record<string, string> = {
  call: 'var(--sw-blue)',
  error: 'var(--error)',
  recovery: 'var(--warning)',
  media: 'var(--sw-turquoise)',
  device: 'var(--sw-purple)',
  connection: 'var(--success)'
};

function appendToLiveFeed(entry: DebugEntry): void {
  const feed = DOM.liveEventFeed;
  // Clear placeholder
  const placeholder = feed.querySelector('.placeholder');
  if (placeholder) placeholder.remove();

  const el = document.createElement('div');
  el.className = 'event-entry';
  const time = entry.t.split('T')[1]?.split('.')[0] ?? entry.t;
  const color = CAT_COLORS[entry.cat] ?? 'var(--fg-muted)';
  el.innerHTML = `<span class="text-muted" style="font-size:11px;">${time}</span> <span style="color:${color};font-weight:500;">[${entry.cat}]</span> ${entry.msg}`;

  feed.insertBefore(el, feed.firstChild);

  // Cap visible entries
  while (feed.children.length > MAX_FEED_ENTRIES) {
    feed.removeChild(feed.lastChild!);
  }
}

function logDebug(cat: string, msg: string, data?: Record<string, unknown>): void {
  const entry: DebugEntry = {
    t: new Date().toISOString(),
    cat,
    msg,
    ...(data !== undefined ? { data } : {})
  };

  // Render to live feed
  appendToLiveFeed(entry);

  // Route to the right log
  if (activeCallSession && cat !== 'connection') {
    activeCallSession.events.push(entry);
    if (activeCallSession.events.length > MAX_ENTRIES_PER_CALL) {
      activeCallSession.events.splice(0, activeCallSession.events.length - MAX_ENTRIES_PER_CALL);
    }
  } else {
    connectionLog.push(entry);
    if (connectionLog.length > MAX_ENTRIES_PER_CALL) {
      connectionLog.splice(0, connectionLog.length - MAX_ENTRIES_PER_CALL);
    }
  }
}

function startCallSession(callId: string, direction: string, destination?: string): void {
  // Archive previous session if exists
  if (activeCallSession) {
    activeCallSession.endedAt = new Date().toISOString();
    callArchive.unshift(activeCallSession);
    if (callArchive.length > MAX_CALLS_KEPT) {
      callArchive.pop();
    }
  }

  activeCallSession = {
    callId,
    direction,
    destination,
    startedAt: new Date().toISOString(),
    lastStats: null,
    events: []
  };
  logDebug('call', `session started: ${direction} to=${destination ?? 'unknown'}`);
}

function endCallSession(): void {
  if (activeCallSession) {
    logDebug('call', 'session ended');
    activeCallSession.endedAt = new Date().toISOString();
    callArchive.unshift(activeCallSession);
    if (callArchive.length > MAX_CALLS_KEPT) {
      callArchive.pop();
    }
    activeCallSession = null;
  }
}

function buildDebugExport(): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sdkDiagnostics: client?.exportDiagnostics() ?? null,
    activeCall: activeCallSession
      ? {
          ...activeCallSession,
          networkIssues: call?.networkIssues ?? []
        }
      : null,
    previousCalls: callArchive,
    connectionLog: [...connectionLog]
  };
}

// ============================================================
// THEME TOGGLE
// ============================================================

function getStoredTheme(): string {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
}

function applyTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    DOM.themeIconSun.classList.remove('hidden');
    DOM.themeIconMoon.classList.add('hidden');
  } else {
    DOM.themeIconSun.classList.add('hidden');
    DOM.themeIconMoon.classList.remove('hidden');
  }
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
}

// Apply saved theme on load
applyTheme(getStoredTheme());
DOM.themeToggle.onclick = toggleTheme;

// ============================================================
// TAB SWITCHING
// ============================================================

function setupTabs(): void {
  DOM.tabNav.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (!tabName) return;

      // Deactivate all tabs
      DOM.tabNav.forEach((t) => t.classList.remove('active'));
      DOM.tabContents.forEach((c) => c.classList.remove('active'));

      // Activate clicked tab
      tab.classList.add('active');
      const targetId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.classList.add('active');
      }
    });
  });
}

setupTabs();

// ============================================================
// TOAST SYSTEM
// ============================================================

const TOAST_ICONS: Record<string, string> = {
  info: '<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--info);"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1" fill="none"/><path d="M10 9v4m0-6h.01"/></svg>',
  success:
    '<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--success);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
  warning:
    '<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--warning);"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
  error:
    '<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--error);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
};

function showToast(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error'
): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type]}</div>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Close button
  const closeBtn = toast.querySelector('.toast-close')!;
  closeBtn.addEventListener('click', () => removeToast(toast));

  DOM.toastContainer.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => removeToast(toast), TOAST_AUTO_DISMISS_MS);
}

function removeToast(toast: HTMLElement): void {
  if (toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove());
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Helper function to create boolean badge
const createBooleanBadge = (value: boolean): string => {
  return value
    ? '<span class="text-success font-semibold">&#10003; Yes</span>'
    : '<span class="text-subtle font-semibold">&#10007; No</span>';
};

// Helper function to render device list
const renderDeviceList = (
  devices: MediaDeviceInfo[],
  container: HTMLDivElement,
  emptyMessage: string
): void => {
  container.innerHTML = '';

  if (devices.length === 0) {
    container.innerHTML = `<p class="text-subtle text-xs">${emptyMessage}</p>`;
    return;
  }

  devices.forEach((device) => {
    const template = DOM.deviceItemTemplate.content.cloneNode(true) as DocumentFragment;
    const labelElement = template.querySelector('.device-label') as HTMLParagraphElement;
    const idElement = template.querySelector('.device-id') as HTMLParagraphElement;

    const label = device.label || 'Unknown device';
    const deviceIdShort = `ID: ${device.deviceId.substring(0, 12)}...`;

    labelElement.textContent = label;
    labelElement.title = label;

    idElement.textContent = deviceIdShort;
    idElement.title = device.deviceId;

    container.appendChild(template);
  });
};

// Device subscriptions are set up in initializeApp() after authentication

// Helper function to get initials from name (returns phone emoji for phone numbers)
const getInitials = (name: string): string => {
  // If name starts with "+", it's likely a phone number
  if (name.startsWith('+')) {
    return '?';
  }
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Helper function to render an address card
const renderAddressCard = (address: Address, onClick: () => void): HTMLElement => {
  const template = DOM.addressCardTemplate.content.cloneNode(true) as DocumentFragment;
  const card = template.querySelector('.address-card') as HTMLDivElement;
  const initialsElement = template.querySelector('.address-initials') as HTMLSpanElement;
  const avatarElement = template.querySelector('.address-avatar') as HTMLDivElement;
  const nameElement = template.querySelector('.address-name') as HTMLParagraphElement;
  const typeElement = template.querySelector('.address-type') as HTMLParagraphElement;

  const displayName = address.displayName || 'Unknown';
  initialsElement.textContent = getInitials(displayName);
  nameElement.textContent = displayName;
  nameElement.title = displayName;
  typeElement.textContent = address.type || 'unknown';

  // Add preview image if available
  if (address.previewUrl) {
    const img = document.createElement('img');
    img.src = address.previewUrl;
    img.alt = displayName;
    avatarElement.innerHTML = '';
    avatarElement.appendChild(img);
  }

  card.addEventListener('click', onClick);
  card.dataset.addressId = address.id;

  return card;
};

// Function to initiate call to an address
const callAddress = async (address: Address) => {
  const channel = address.defaultChannel;
  if (!channel) {
    showToast('No Channel', `No callable channel for ${address.displayName}`, 'error');
    return;
  }

  try {
    // Use media options from the UI checkboxes
    const sendVideo = DOM.sendVideoToggle.checked;
    const sendAudio = DOM.sendAudioToggle.checked;
    call = await client!.dial(channel, {
      audio: sendAudio,
      video: sendVideo,
      receiveVideo: sendVideo,
      receiveAudio: sendAudio
    });
    // Remember destination for auto-redial on reload
    storeLastDestination(channel);

    console.log('Call initiated to address:', address.displayName, call);
    if (call) {
      // Update the input field to show what we're calling
      DOM.toAddressInput.value = channel;
      subscribeToCallObservables(call);
    }
  } catch (error) {
    console.error('Error calling address:', error);
    showToast('Call Failed', (error as Error).message, 'error');
  }
};

// Subscribe to directory addresses when connected
const subscribeToDirectory = () => {
  const directory = client!.directory;
  if (!directory) return;
  let currentAddressCount = 0;

  // Subscribe to addresses list
  directory.addresses$.subscribe((addresses: Address[]) => {
    DOM.addressesContainer.innerHTML = '';
    currentAddressCount = addresses.length;

    if (addresses.length === 0) {
      DOM.addressesContainer.innerHTML =
        '<p class="text-subtle text-xs">No addresses found in directory</p>';
      DOM.addressCount.textContent = '';
      return;
    }

    addresses.forEach((address) => {
      const card = renderAddressCard(address, () => callAddress(address));
      DOM.addressesContainer.appendChild(card);
    });

    // Update address count display
    DOM.addressCount.textContent = `(${addresses.length})`;
  });

  // Subscribe to hasMore state
  directory.hasMore$.subscribe((hasMore: boolean) => {
    if (hasMore) {
      DOM.loadMoreAddressesButton.classList.remove('hidden');
      DOM.addressCount.textContent = `(${currentAddressCount}+)`;
    } else {
      DOM.loadMoreAddressesButton.classList.add('hidden');
      if (currentAddressCount > 0) {
        DOM.addressCount.textContent = `(${currentAddressCount})`;
      }
    }
  });

  // Subscribe to loading state
  directory.loading$.subscribe((loading: boolean) => {
    DOM.loadMoreAddressesButton.disabled = loading;
    if (loading) {
      DOM.loadMoreText.textContent = 'Loading...';
      DOM.loadMoreSpinner.classList.remove('hidden');
    } else {
      DOM.loadMoreText.textContent = 'Load More';
      DOM.loadMoreSpinner.classList.add('hidden');
    }
  });

  // Load more button click handler
  DOM.loadMoreAddressesButton.onclick = () => {
    directory.loadMore();
  };

  // Trigger initial load
  directory.loadMore();
};

// Helper function to check if screen share is active
const isScreenShareActive = (call: Call): boolean => {
  return call.self?.screenShareStatus === 'started';
};

// Helper function to setup the dialpad
const setupDialpad = (call: Call) => {
  // Clear the input field
  DOM.dialpadInput.value = '';

  // Hide any error message
  DOM.dialpadErrorMessage.classList.add('hidden');

  // Setup digit button click handlers
  DOM.dialpadDigitButtons.forEach((button) => {
    button.onclick = async () => {
      const digit = button.dataset.digit;
      if (digit) {
        // Append digit to input
        DOM.dialpadInput.value += digit;

        // Send the single digit immediately
        try {
          showDialpadSpinner(true);
          await call.sendDigits(digit);
          hideDialpadError();
        } catch (error) {
          showDialpadError('Error sending digit: ' + (error as Error).message);
        } finally {
          showDialpadSpinner(false);
        }
      }
    };
  });

  // Setup SEND button click handler
  DOM.dialpadSendButton.onclick = async () => {
    const digits = DOM.dialpadInput.value.trim();
    if (!digits) {
      showDialpadError('Please enter digits to send');
      return;
    }

    try {
      showDialpadSpinner(true);
      await call.sendDigits(digits);
      hideDialpadError();
      // Clear the input after successful send
      DOM.dialpadInput.value = '';
    } catch (error) {
      showDialpadError('Error sending digits: ' + (error as Error).message);
    } finally {
      showDialpadSpinner(false);
    }
  };

  // Setup ERROR button click handler (sends null to trigger error)
  DOM.dialpadErrorButton.onclick = async () => {
    try {
      showDialpadSpinner(true);
      // @ts-ignore Intentionally sending null to test runtime error handling
      await call.sendDigits(null);
      hideDialpadError();
    } catch (error) {
      showDialpadError('Error: Invalid DTMF input - ' + (error as Error).message);
    } finally {
      showDialpadSpinner(false);
    }
  };
};

// Helper functions for dialpad UI state
const showDialpadSpinner = (show: boolean) => {
  if (show) {
    DOM.dialpadSpinner.classList.remove('hidden');
    DOM.dialpadSendText.textContent = 'Sending...';
    DOM.dialpadSendButton.disabled = true;
    DOM.dialpadErrorButton.disabled = true;
  } else {
    DOM.dialpadSpinner.classList.add('hidden');
    DOM.dialpadSendText.textContent = 'SEND';
    DOM.dialpadSendButton.disabled = false;
    DOM.dialpadErrorButton.disabled = false;
  }
};

const showDialpadError = (message: string) => {
  DOM.dialpadErrorText.textContent = message;
  DOM.dialpadErrorMessage.classList.remove('hidden');
};

const hideDialpadError = () => {
  DOM.dialpadErrorMessage.classList.add('hidden');
  DOM.dialpadErrorText.textContent = '';
};

// Helper function to render a message in the messages container
const renderMessage = (message: TextMessage<Address>, container: HTMLDivElement) => {
  const messageElement = document.createElement('div');
  messageElement.className = 'message-bubble';
  messageElement.id = `message-${message.id}`;

  const textElement = document.createElement('p');
  textElement.className = 'message-text';
  textElement.textContent = message.text;

  const metaElement = document.createElement('p');
  metaElement.className = 'message-meta';
  metaElement.textContent = 'Loading sender...';

  // Subscribe to the fromAddress$ to get the sender's display name
  message.fromAddress$.subscribe((address) => {
    if (address) {
      metaElement.textContent = address.displayName || 'Unknown';
    }
  });

  messageElement.appendChild(textElement);
  messageElement.appendChild(metaElement);
  container.appendChild(messageElement);

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
};

// =============================================================================
// RESILIENCE UI HELPERS
// =============================================================================

// Maximum number of recovery event log entries to keep in the scrollable list
const MAX_RECOVERY_LOG_ENTRIES = 50;

// Map quality level to color classes
const QUALITY_LEVEL_COLORS: Record<QualityLevel, { badge: string; score: string; dot: string }> = {
  excellent: { badge: 'badge-success', score: 'text-success', dot: 'green' },
  good: { badge: 'badge-success', score: 'text-success', dot: 'green' },
  fair: { badge: 'badge-gold', score: 'text-warning', dot: 'yellow' },
  poor: { badge: 'badge-error', score: 'text-error', dot: 'red' },
  critical: { badge: 'badge-error', score: 'text-error', dot: 'red' }
};

// Map recovery state to badge class
const RECOVERY_STATE_COLORS: Record<RecoveryState, string> = {
  idle: '',
  debouncing: 'badge-gold',
  recovering: 'badge-gold',
  cooldown: 'badge-blue'
};

// Helper: render the active network issues list
const renderNetworkIssues = (issues: CallNetworkIssue[]): void => {
  if (issues.length === 0) {
    DOM.networkIssuesList.innerHTML = '<p class="text-subtle">No active issues</p>';
    return;
  }
  DOM.networkIssuesList.innerHTML = issues
    .map((issue) => {
      const cls = issue.severity === 'critical' ? 'issue-critical' : 'issue-warning';
      const valueStr = issue.value !== undefined ? ` (${issue.value.toFixed(1)})` : '';
      return `<p class="${cls}"><span class="font-semibold">${issue.type}</span> [${issue.severity}]${valueStr}</p>`;
    })
    .join('');
};

// Helper: add a recovery event entry to the scrollable log (latest at top)
const addRecoveryEventEntry = (event: RecoveryEvent): void => {
  // Clear the placeholder if present
  const placeholder = DOM.recoveryEventLog.querySelector('.placeholder');
  if (placeholder) {
    DOM.recoveryEventLog.innerHTML = '';
  }

  const time = new Date(event.timestamp).toLocaleTimeString();
  const attemptStr =
    event.attempt !== undefined ? ` attempt ${event.attempt}/${event.maxAttempts ?? '?'}` : '';
  const entry = document.createElement('p');
  entry.textContent = `[${time}] ${event.action}${attemptStr} — ${event.reason}`;

  // Insert at the top so latest events appear first
  DOM.recoveryEventLog.prepend(entry);

  // Trim old entries beyond the cap
  while (DOM.recoveryEventLog.children.length > MAX_RECOVERY_LOG_ENTRIES) {
    DOM.recoveryEventLog.removeChild(DOM.recoveryEventLog.lastChild!);
  }
};

// Helper: show brief "Sent!" flash on a button text element, then restore original
const flashSentFeedback = (textElement: HTMLSpanElement, originalText: string): void => {
  textElement.textContent = 'Sent!';
  setTimeout(() => {
    textElement.textContent = originalText;
  }, 1000);
};

// Helper: render platform capabilities as a grid of green/red badges
const renderPlatformCapabilities = (caps: PlatformCapabilities): void => {
  // Boolean capability entries to display
  const booleanCaps: { label: string; value: boolean }[] = [
    { label: 'WebRTC', value: caps.webrtc },
    { label: 'getUserMedia', value: caps.getUserMedia },
    { label: 'getDisplayMedia', value: caps.getDisplayMedia },
    { label: 'Screen Share', value: caps.screenShare },
    { label: 'Screen Audio', value: caps.screenShareAudio },
    { label: 'Simulcast', value: caps.simulcast },
    { label: 'Insertable Streams', value: caps.insertableStreams },
    { label: 'Audio Output Selection', value: caps.audioOutputSelection }
  ];

  DOM.platformCapabilitiesGrid.innerHTML = booleanCaps
    .map((cap) => {
      const cls = cap.value ? 'cap-yes' : 'cap-no';
      const icon = cap.value ? '&#10003;' : '&#10007;';
      return `<div class="cap-item ${cls}">${icon} ${cap.label}</div>`;
    })
    .join('');

  // Render codec lists below the capabilities grid
  const videoCodecs =
    caps.videoCodecs.length > 0
      ? caps.videoCodecs.map((c) => `<span class="codec-tag codec-video">${c}</span>`).join(' ')
      : '<span class="text-subtle text-xs">None detected</span>';
  const audioCodecs =
    caps.audioCodecs.length > 0
      ? caps.audioCodecs.map((c) => `<span class="codec-tag codec-audio">${c}</span>`).join(' ')
      : '<span class="text-subtle text-xs">None detected</span>';

  DOM.supportedCodecs.innerHTML =
    `<div style="width:100%;"><p class="text-xs text-muted" style="margin-bottom:2px;">Video:</p><div class="flex-wrap" style="margin-bottom:6px;">${videoCodecs}</div>` +
    `<p class="text-xs text-muted" style="margin-bottom:2px;">Audio:</p><div class="flex-wrap">${audioCodecs}</div></div>`;
};

// Helper: add a device recovery event entry to the device recovery log
// ============================================================
// STAT COLOR-CODING HELPERS
// ============================================================

// Color-code a stat cell based on thresholds
const colorCodeStat = (
  cell: HTMLElement,
  value: number,
  greenMax: number,
  yellowMax: number,
  invert: boolean = false
): void => {
  // Remove old classes
  cell.classList.remove('stat-green', 'stat-yellow', 'stat-red');
  if (invert) {
    // Higher is better (e.g., bitrate)
    if (value > yellowMax) cell.classList.add('stat-green');
    else if (value > greenMax) cell.classList.add('stat-yellow');
    else cell.classList.add('stat-red');
  } else {
    // Lower is better (e.g., RTT, jitter, loss)
    if (value < greenMax) cell.classList.add('stat-green');
    else if (value < yellowMax) cell.classList.add('stat-yellow');
    else cell.classList.add('stat-red');
  }
};

// Track current call address for messaging
let currentCallAddress: CallAddress | null = null;
let messagesSubscription: Subscription | null = null;

// ============================================================
// CALL OBSERVABLE SUBSCRIPTIONS
// ============================================================

// Helper function to subscribe to call observables
const subscribeToCallObservables = (call: Call) => {
  const callId = (call as unknown as { id: string }).id;
  startCallSession(callId, call.direction, call.to);
  // Show call state cards
  DOM.callStateCard.classList.remove('hidden');
  DOM.selfControlsCard.classList.remove('hidden');
  DOM.floatingCallStatus.classList.add('visible');
  DOM.qualityOverlay.classList.remove('hidden');

  // Setup dialpad functionality
  setupDialpad(call);

  // Enable hangup button
  DOM.hangupButton.disabled = false;

  // Hangup handler (shared by sidebar button and controls bar)
  const doHangup = async () => {
    try {
      await call.hangup();
      endCallSession();
      // Hide cards after hangup
      DOM.callStateCard.classList.add('hidden');
      DOM.selfControlsCard.classList.add('hidden');
      DOM.floatingCallStatus.classList.remove('visible');
      DOM.qualityOverlay.classList.add('hidden');
      DOM.hangupButton.disabled = true;
      // Reset resilience UI to defaults for next call
      DOM.mosScore.textContent = '--';
      DOM.mosScore.className = 'stat-value text-success';
      DOM.qualityLevelBadge.textContent = '--';
      DOM.qualityLevelBadge.className = 'badge';
      DOM.networkHealthDot.className = 'status-dot';
      DOM.networkHealthText.textContent = '--';
      DOM.recoveryStateBadge.textContent = '--';
      DOM.recoveryStateBadge.className = 'badge';
      DOM.bandwidthConstrainedBanner.classList.remove('visible');
      DOM.networkIssuesList.innerHTML = '<p class="text-subtle">No active issues</p>';
      DOM.statRtt.textContent = '--';
      DOM.statRtt.className = '';
      DOM.statAudioJitter.textContent = '--';
      DOM.statAudioJitter.className = '';
      DOM.statAudioPackets.textContent = '--';
      DOM.statVideoPackets.textContent = '--';
      DOM.statPacketLoss.textContent = '--';
      DOM.statPacketLoss.className = '';
      DOM.statBitrate.textContent = '--';
      DOM.statBitrate.className = '';
      DOM.recoveryEventLog.innerHTML = '<p class="placeholder">No recovery events yet</p>';
      // Reset quality overlay
      DOM.qualityDot.className = 'quality-dot green';
      DOM.qualityScoreDisplay.textContent = '--';
      DOM.qualityLevelDisplay.textContent = '--';
      DOM.qualityOverlay.classList.remove('recovering');
      // Cleanup messages subscription
      if (messagesSubscription) {
        messagesSubscription.unsubscribe();
        messagesSubscription = null;
      }
      currentCallAddress = null;
      DOM.messagesContainer.innerHTML =
        '<p class="text-subtle text-xs" style="text-align:center;">No messages yet</p>';
    } catch (error) {
      console.error('Error hanging up:', error);
    }
  };

  DOM.hangupButton.onclick = doHangup;
  DOM.hangupCtrlBtn.onclick = doHangup;

  // Helper function to update screen share button
  const updateScreenShareButton = () => {
    const isSharing = isScreenShareActive(call);
    DOM.screenShareButton.classList.toggle('active', isSharing);
  };

  // Enable screen share button
  DOM.screenShareButton.disabled = false;
  DOM.screenShareButton.onclick = async () => {
    try {
      if (isScreenShareActive(call)) {
        await call.self?.stopScreenShare();
      } else {
        await call.self?.startScreenShare();
      }
      // Update button state after the API resolves
      updateScreenShareButton();
    } catch (error) {
      // startScreenShare() rejects with the raw getDisplayMedia error and the
      // call is unaffected. A dismissed picker or a permission denial rejects
      // with NotAllowedError (AbortError on some platforms) — that's a benign
      // cancel, so don't alarm the user with an error toast.
      const name = (error as Error).name;
      if (name === 'NotAllowedError' || name === 'AbortError') {
        console.info('Screen share cancelled by user:', name);
        updateScreenShareButton();
        return;
      }
      console.error('Error toggling screen share:', error);
      showToast('Screen Share Error', (error as Error).message, 'error');
    }
  };

  // Subscribe to self participant and setup controls when available
  call.self$.subscribe((self) => {
    if (!self) return;

    // Toggle Audio Input
    const updateAudioButton = () => {
      const isMuted = self.audioMuted;
      DOM.toggleAudioButton.classList.toggle('muted', isMuted);
      DOM.toggleAudioButton.classList.toggle('active', !isMuted);
    };

    DOM.toggleAudioButton.onclick = async () => {
      try {
        await self.toggleMute();
        updateAudioButton();
      } catch (error) {
        console.error('Error toggling audio:', error);
        showToast('Audio Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to audio muted state for reactive updates
    self.audioMuted$.subscribe(() => {
      updateAudioButton();
    });

    // Toggle Video Input
    const updateVideoButton = () => {
      const isMuted = self.videoMuted;
      DOM.toggleVideoButton.classList.toggle('muted', isMuted);
      DOM.toggleVideoButton.classList.toggle('active', !isMuted);
    };

    DOM.toggleVideoButton.onclick = async () => {
      try {
        await self.toggleMuteVideo();
        updateVideoButton();
      } catch (error) {
        console.error('Error toggling video:', error);
        showToast('Video Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to video muted state for reactive updates
    self.videoMuted$.subscribe(() => {
      updateVideoButton();
    });

    // Toggle Deaf
    const updateDeafButton = () => {
      const isDeaf = self.deaf;
      DOM.toggleDeafButton.classList.toggle('muted', isDeaf);
    };

    DOM.toggleDeafButton.onclick = async () => {
      try {
        await self.toggleDeaf();
        updateDeafButton();
      } catch (error) {
        console.error('Error toggling deaf:', error);
        showToast('Deaf Toggle Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to deaf state for reactive updates
    self.deaf$.subscribe(() => {
      updateDeafButton();
    });

    // Toggle Hand Raise
    const updateHandRaiseButton = () => {
      const isRaised = self.handraised;
      DOM.toggleHandRaiseButton.classList.toggle('active', isRaised);
    };

    DOM.toggleHandRaiseButton.onclick = async () => {
      try {
        await self.toggleHandraise();
        updateHandRaiseButton();
      } catch (error) {
        console.error('Error toggling hand raise:', error);
        showToast('Hand Raise Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to handraised state for reactive updates
    self.handraised$.subscribe(() => {
      updateHandRaiseButton();
    });

    // Input Volume Control
    DOM.inputVolumeSlider.oninput = () => {
      DOM.inputVolumeValue.textContent = DOM.inputVolumeSlider.value;
    };

    DOM.inputVolumeSlider.onchange = async () => {
      try {
        const value = parseInt(DOM.inputVolumeSlider.value, 10);
        await self.setAudioInputVolume(value);
      } catch (error) {
        console.error('Error setting input volume:', error);
        showToast('Volume Error', (error as Error).message, 'error');
      }
    };

    // Output Volume Control
    DOM.outputVolumeSlider.oninput = () => {
      DOM.outputVolumeValue.textContent = DOM.outputVolumeSlider.value;
    };

    DOM.outputVolumeSlider.onchange = async () => {
      try {
        const value = parseInt(DOM.outputVolumeSlider.value, 10);
        await self.setAudioOutputVolume(value);
      } catch (error) {
        console.error('Error setting output volume:', error);
        showToast('Volume Error', (error as Error).message, 'error');
      }
    };

    // Input Sensitivity Control
    DOM.inputSensitivitySlider.oninput = () => {
      DOM.inputSensitivityValue.textContent = DOM.inputSensitivitySlider.value;
    };

    DOM.inputSensitivitySlider.onchange = async () => {
      try {
        const value = parseInt(DOM.inputSensitivitySlider.value, 10);
        await self.setAudioInputSensitivity(value);
      } catch (error) {
        console.error('Error setting input sensitivity:', error);
        showToast('Sensitivity Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to volume observables to update UI
    self.inputVolume$.subscribe((volume) => {
      if (volume !== undefined) {
        DOM.inputVolumeSlider.value = volume.toString();
        DOM.inputVolumeValue.textContent = volume.toString();
      }
    });

    self.outputVolume$.subscribe((volume) => {
      if (volume !== undefined) {
        DOM.outputVolumeSlider.value = volume.toString();
        DOM.outputVolumeValue.textContent = volume.toString();
      }
    });

    self.inputSensitivity$.subscribe((sensitivity) => {
      if (sensitivity !== undefined) {
        DOM.inputSensitivitySlider.value = sensitivity.toString();
        DOM.inputSensitivityValue.textContent = sensitivity.toString();
      }
    });

    // Toggle Echo Cancellation
    const updateEchoCancellationButton = () => {
      const isEnabled = self.echoCancellation;
      DOM.toggleEchoCancellationButton.textContent = `Echo Cancel: ${isEnabled ? 'ON' : 'OFF'}`;
      DOM.toggleEchoCancellationButton.classList.toggle('btn-primary', isEnabled);
      DOM.toggleEchoCancellationButton.classList.toggle('btn-ghost', !isEnabled);
    };

    DOM.toggleEchoCancellationButton.onclick = async () => {
      try {
        await self.toggleEchoCancellation();
        updateEchoCancellationButton();
      } catch (error) {
        console.error('Error toggling echo cancellation:', error);
        showToast('Echo Cancel Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to echo cancellation state for reactive updates
    self.echoCancellation$.subscribe(() => {
      updateEchoCancellationButton();
    });

    // Toggle Auto Gain
    const updateAutoGainButton = () => {
      const isEnabled = self.autoGain;
      DOM.toggleAutoGainButton.textContent = `Auto Gain: ${isEnabled ? 'ON' : 'OFF'}`;
      DOM.toggleAutoGainButton.classList.toggle('btn-primary', isEnabled);
      DOM.toggleAutoGainButton.classList.toggle('btn-ghost', !isEnabled);
    };

    DOM.toggleAutoGainButton.onclick = async () => {
      try {
        await self.toggleAudioInputAutoGain();
        updateAutoGainButton();
      } catch (error) {
        console.error('Error toggling auto gain:', error);
        showToast('Auto Gain Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to auto gain state for reactive updates
    self.autoGain$.subscribe(() => {
      updateAutoGainButton();
    });

    // Toggle Noise Suppression
    const updateNoiseSuppressionButton = () => {
      const isEnabled = self.noiseSuppression;
      DOM.toggleNoiseSuppressionButton.textContent = `Noise Supp.: ${isEnabled ? 'ON' : 'OFF'}`;
      DOM.toggleNoiseSuppressionButton.classList.toggle('btn-primary', isEnabled);
      DOM.toggleNoiseSuppressionButton.classList.toggle('btn-ghost', !isEnabled);
    };

    DOM.toggleNoiseSuppressionButton.onclick = async () => {
      try {
        await self.toggleNoiseSuppression();
        updateNoiseSuppressionButton();
      } catch (error) {
        console.error('Error toggling noise suppression:', error);
        showToast('Noise Suppression Error', (error as Error).message, 'error');
      }
    };

    // Subscribe to noise suppression state for reactive updates
    self.noiseSuppression$.subscribe(() => {
      updateNoiseSuppressionButton();
    });

    // Remove Self Button
    DOM.removeSelfButton.onclick = async () => {
      if (confirm('Are you sure you want to remove yourself from the call?')) {
        try {
          await self.remove();
        } catch (error) {
          console.error('Error removing self:', error);
          showToast('Remove Error', (error as Error).message, 'error');
        }
      }
    };

    // End Call Button
    DOM.endCallButton.onclick = async () => {
      if (confirm('Are you sure you want to end the call for everyone?')) {
        try {
          await self.end();
        } catch (error) {
          console.error('Error ending call:', error);
          showToast('End Call Error', (error as Error).message, 'error');
        }
      }
    };

    // Device selection change handlers — use client-level device selection
    // (select population is in initializeApp, not here)
    DOM.audioInputDeviceSelect.onchange = async () => {
      const deviceId = DOM.audioInputDeviceSelect.value;
      if (!deviceId) return;
      const device = client!.audioInputDevices.find((d) => d.deviceId === deviceId);
      if (device) {
        try {
          client!.selectAudioInputDevice(device);
          console.log('Audio input device changed to:', device.label);
        } catch (error) {
          console.error('Error selecting audio input device:', error);
          showToast('Device Error', (error as Error).message, 'error');
        }
      }
    };

    DOM.videoInputDeviceSelect.onchange = async () => {
      const deviceId = DOM.videoInputDeviceSelect.value;
      if (!deviceId) return;
      const device = client!.videoInputDevices.find((d) => d.deviceId === deviceId);
      if (device) {
        try {
          client!.selectVideoInputDevice(device);
          console.log('Video input device changed to:', device.label);
        } catch (error) {
          console.error('Error selecting video input device:', error);
          showToast('Device Error', (error as Error).message, 'error');
        }
      }
    };

    // Initialize button states
    updateAudioButton();
    updateVideoButton();
    updateDeafButton();
    updateHandRaiseButton();
    updateEchoCancellationButton();
    updateAutoGainButton();
    updateNoiseSuppressionButton();
  });

  // Subscribe to call status
  call.status$.subscribe((status) => {
    logDebug('call', `status: ${status}`);
    if (status === 'destroyed' || status === 'failed') {
      endCallSession();
    }
    const isError = status === 'destroyed' || status === 'failed';

    // Update call status text
    DOM.callStatus.textContent = status.toUpperCase();
    DOM.callStatus.classList.remove('text-success', 'text-error', 'text-warning');
    if (status === 'connected') DOM.callStatus.classList.add('text-success');
    else if (isError) DOM.callStatus.classList.add('text-error');
    else DOM.callStatus.classList.add('text-warning');

    // Update floating call status
    DOM.floatingCallStatusText.textContent = status.toUpperCase();
    DOM.floatingCallStatusText.classList.remove('text-success', 'text-error', 'text-warning');
    if (status === 'connected') DOM.floatingCallStatusText.classList.add('text-success');
    else if (isError) DOM.floatingCallStatusText.classList.add('text-error');
    else DOM.floatingCallStatusText.classList.add('text-warning');

    // Update status indicator dot
    DOM.statusIndicator.classList.remove('connected', 'disconnected', 'connecting');
    if (status === 'connected') DOM.statusIndicator.classList.add('connected');
    else if (isError) DOM.statusIndicator.classList.add('disconnected');
    else DOM.statusIndicator.classList.add('connecting');
  });

  // Subscribe to call errors
  // fatal errors automatically transition the call to 'failed' and destroy it
  call.errors$.subscribe((callError: CallError) => {
    const label = callError.fatal ? 'Fatal call error' : 'Call error';
    console.error(`[${callError.kind}] ${label} (callId: ${callError.callId}):`, callError.error);
    logDebug('error', `${label}: ${callError.error.message}`, {
      kind: callError.kind,
      fatal: callError.fatal,
      callId: callError.callId,
      stack: callError.error.stack
    });
    // Non-fatal MediaAccessError: camera/mic was denied or unavailable and the
    // call degraded to receive-only instead of failing (fallbackToReceiveOnly).
    // Note: errors$ emits a CallError wrapper — the typed error is on `.error`.
    if (!callError.fatal && callError.error instanceof MediaAccessError) {
      showToast(
        'Media unavailable',
        callError.error.media === 'screen'
          ? 'Could not access screen — continuing call'
          : 'Could not access audio/video — call continues in receive-only mode.',
        'warning'
      );
      return;
    }
    const toastType = callError.fatal ? 'error' : 'warning';
    showToast(`${label} [${callError.kind}]`, callError.error.message, toastType);
  });

  // Display call direction
  DOM.callDirection.textContent = call.direction.toUpperCase();

  // Subscribe to recording state
  call.recording$.subscribe((recording) => {
    DOM.callRecording.innerHTML = createBooleanBadge(recording);
  });

  // Subscribe to streaming state
  call.streaming$.subscribe((streaming) => {
    DOM.callStreaming.innerHTML = createBooleanBadge(streaming);
  });

  // Subscribe to locked state
  call.locked$.subscribe((locked) => {
    DOM.callLocked.innerHTML = createBooleanBadge(locked);
  });

  // Subscribe to raise hand priority state
  call.raiseHandPriority$.subscribe((raiseHandPriority) => {
    DOM.callRaiseHandPriority.innerHTML = createBooleanBadge(raiseHandPriority);
  });

  // Subscribe to media directions
  call.mediaDirections$.subscribe((directions) => {
    DOM.mediaAudio.textContent = directions.audio.toUpperCase();
    DOM.mediaVideo.textContent = directions.video.toUpperCase();
  });

  // Subscribe to capabilities
  call.capabilities$.subscribe((capabilities) => {
    DOM.callCapabilities.innerHTML =
      capabilities.length > 0
        ? capabilities.map((cap) => `<span class="badge badge-blue">${cap}</span>`).join(' ')
        : '<span class="text-subtle">No capabilities</span>';
  });

  // Subscribe to meta data
  call.meta$.subscribe((meta) => {
    DOM.callMeta.textContent =
      Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : 'No meta data';
  });

  // Subscribe to layout
  call.layout$.subscribe((layout) => {
    DOM.callLayout.textContent = layout || 'No layout set';
  });

  // Subscribe to available layouts
  call.layouts$.subscribe((layouts) => {
    DOM.callLayouts.innerHTML =
      layouts.length > 0
        ? layouts.map((layout) => `<span class="badge badge-fuchsia">${layout}</span>`).join(' ')
        : '<span class="text-subtle">No layouts available</span>';
  });

  // Subscribe to participants
  const participantsMap = new Map<string, HTMLDivElement>();

  call.participants$.subscribe((participants) => {
    console.log('Participants updated:', participants);

    // Update screen share button state
    updateScreenShareButton();

    // Remove participants that are no longer in the list
    participantsMap.forEach((element, id) => {
      if (!participants.find((p) => p.id === id)) {
        element.remove();
        participantsMap.delete(id);
      }
    });

    // Update or add participants
    participants.forEach((participant) => {
      let participantElement = participantsMap.get(participant.id);

      if (!participantElement) {
        participantElement = document.createElement('div');
        participantElement.className = 'participant-card';
        participantElement.id = `participant-${participant.id}`;
        DOM.participantsList.appendChild(participantElement);
        participantsMap.set(participant.id, participantElement);

        // Subscribe to participant observables
        subscribeToParticipantObservables(participant, participantElement);
      }
    });

    // Show empty state if no participants
    if (participants.length === 0) {
      DOM.participantsList.innerHTML =
        '<p class="text-subtle text-xs" style="text-align:center;padding:16px;">No participants yet</p>';
    }
  });

  // Subscribe to self participant
  call.self$.subscribe((self) => {
    console.log('Self participant updated:', self);
  });

  // Handle local and remote video streams
  call.localStream$.subscribe((stream) => {
    if (stream) {
      DOM.localVideo.srcObject = stream;
    }
  });

  call.remoteStream$.subscribe((stream) => {
    if (stream) {
      DOM.remoteVideo.srcObject = stream;
    }
  });

  // Subscribe to call's address for text messages
  currentCallAddress = call.address;
  console.log('Call address available:', currentCallAddress.displayName);

  // Setup send message handler
  const sendMessage = async () => {
    const text = DOM.messageInput.value.trim();
    if (!text || !currentCallAddress) return;

    try {
      await currentCallAddress.sendText(text);
      DOM.messageInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Message Error', (error as Error).message, 'error');
    }
  };

  DOM.sendMessageButton.onclick = sendMessage;
  DOM.messageInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Subscribe to textMessages$ observable
  currentCallAddress.textMessages$.subscribe((textMessagesCollection) => {
    if (!textMessagesCollection) {
      console.log('No text messages collection available');
      return;
    }

    console.log('Text messages collection available');

    // Clear existing messages
    DOM.messagesContainer.innerHTML = '';

    // Subscribe to the values$ observable for real-time updates
    messagesSubscription = textMessagesCollection.values$.subscribe((messages: TextMessage[]) => {
      console.log('Messages updated:', messages.length);

      // Clear and re-render all messages
      DOM.messagesContainer.innerHTML = '';

      if (messages.length === 0) {
        DOM.messagesContainer.innerHTML =
          '<p class="text-subtle text-xs" style="text-align:center;">No messages yet</p>';
        return;
      }

      messages.forEach((message: TextMessage) => {
        renderMessage(message, DOM.messagesContainer);
      });
    });

    // Subscribe to hasMore$ to implement infinite scroll
    textMessagesCollection.hasMore$.subscribe((hasMore: boolean) => {
      if (hasMore) {
        // Add scroll listener for infinite scroll
        DOM.messagesContainer.onscroll = () => {
          // Load more when scrolled near the top (for older messages)
          if (DOM.messagesContainer.scrollTop < 50) {
            textMessagesCollection.loadMore();
          }
        };
      } else {
        DOM.messagesContainer.onscroll = null;
      }
    });
  });

  // ===========================================================================
  // RESILIENCE FEATURE SUBSCRIPTIONS
  // ===========================================================================

  // Subscribe to MOS quality score — updates the large score display in real time.
  call.qualityScore$.subscribe((score: number) => {
    DOM.mosScore.textContent = score.toFixed(1);
    // Also update the quality overlay on video
    DOM.qualityScoreDisplay.textContent = score.toFixed(1);
  });

  // Subscribe to quality level — updates badges and quality overlay dot.
  call.qualityLevel$.subscribe((level: QualityLevel) => {
    const colors = QUALITY_LEVEL_COLORS[level];
    DOM.qualityLevelBadge.textContent = level.toUpperCase();
    DOM.qualityLevelBadge.className = `badge ${colors.badge}`;
    DOM.mosScore.className = `stat-value ${colors.score}`;
    // Update quality overlay
    DOM.qualityLevelDisplay.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    DOM.qualityDot.className = `quality-dot ${colors.dot}`;
  });

  // Subscribe to raw network metrics — updates the live stats table every second.
  // Stats snapshot saved silently for export — no debug log entry (too noisy).
  call.networkMetrics$.subscribe((metrics: CallNetworkMetrics[]) => {
    if (metrics.length === 0) return;
    const latest = metrics[metrics.length - 1];
    if (activeCallSession) activeCallSession.lastStats = latest;

    // RTT in milliseconds
    const rttMs = latest.roundTripTime;
    DOM.statRtt.textContent = `${rttMs.toFixed(0)} ms`;
    colorCodeStat(DOM.statRtt, rttMs, 100, 300);

    // Audio jitter in milliseconds
    const jitterMs = latest.audio.jitter;
    DOM.statAudioJitter.textContent = `${jitterMs.toFixed(1)} ms`;
    colorCodeStat(DOM.statAudioJitter, jitterMs, 30, 100);

    // Audio packets: received / lost
    DOM.statAudioPackets.textContent = `${latest.audio.packetsReceived.toLocaleString()} recv / ${latest.audio.packetsLost.toLocaleString()} lost`;

    // Video packets: received / lost
    DOM.statVideoPackets.textContent = `${latest.video.packetsReceived.toLocaleString()} recv / ${latest.video.packetsLost.toLocaleString()} lost`;

    // Packet loss percentage (computed from totals)
    const totalRecv = latest.audio.packetsReceived + latest.video.packetsReceived;
    const totalLost = latest.audio.packetsLost + latest.video.packetsLost;
    const lossPercent = totalRecv + totalLost > 0 ? (totalLost / (totalRecv + totalLost)) * 100 : 0;
    DOM.statPacketLoss.textContent = `${lossPercent.toFixed(2)}%`;
    colorCodeStat(DOM.statPacketLoss, lossPercent, 1, 5);

    // Outgoing bitrate (may not always be reported by the browser)
    if (latest.availableOutgoingBitrate !== undefined) {
      const kbps = latest.availableOutgoingBitrate / 1000;
      DOM.statBitrate.textContent =
        kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps.toFixed(0)} kbps`;
      colorCodeStat(DOM.statBitrate, kbps, 500, 1000, true);
    } else {
      DOM.statBitrate.textContent = 'N/A';
    }
  });

  // Subscribe to network health — shows green/red dot
  call.isNetworkHealthy$.subscribe((healthy: boolean) => {
    DOM.networkHealthDot.className = healthy ? 'status-dot healthy' : 'status-dot degraded';
    DOM.networkHealthText.textContent = healthy ? 'Healthy' : 'Degraded';
    DOM.networkHealthText.classList.remove('text-success', 'text-error');
    DOM.networkHealthText.classList.add(healthy ? 'text-success' : 'text-error');
  });

  // Subscribe to network issues — only log when issues appear (not every empty tick)
  call.networkIssues$.subscribe((issues: CallNetworkIssue[]) => {
    if (issues.length > 0) {
      logDebug(
        'media',
        `network issues: ${issues.map((i) => `${i.type}(${i.severity})`).join(', ')}`,
        {
          issues: issues.map((i) => ({ type: i.type, severity: i.severity, value: i.value }))
        }
      );
    }
    renderNetworkIssues(issues);
  });

  // Subscribe to bandwidth constrained state
  call.bandwidthConstrained$.subscribe((constrained: boolean) => {
    if (constrained) logDebug('media', 'bandwidth constrained — video may be paused');
    DOM.bandwidthConstrainedBanner.classList.toggle('visible', constrained);
    // Show toast notification
    if (constrained) {
      showToast('Bandwidth', 'Video paused, low bandwidth', 'warning');
    } else if (DOM.bandwidthConstrainedBanner.classList.contains('visible') === false) {
      // Only toast "restored" if it was previously constrained
    }
  });

  // Subscribe to recovery pipeline state
  call.recoveryState$.subscribe((state: RecoveryState) => {
    logDebug('recovery', `state: ${state}`);
    DOM.recoveryStateBadge.textContent = state.toUpperCase();
    DOM.recoveryStateBadge.className = `badge ${RECOVERY_STATE_COLORS[state]}`;
    // Pulse the quality overlay when recovering
    DOM.qualityOverlay.classList.toggle('recovering', state === 'recovering');
  });

  // Subscribe to recovery events
  call.recoveryEvent$.subscribe((event: RecoveryEvent) => {
    logDebug('recovery', `${event.action}: ${event.reason}`, {
      attempt: event.attempt,
      maxAttempts: event.maxAttempts
    });
    addRecoveryEventEntry(event);

    // Show toast based on event action
    if (event.action === 'reinvite_started') {
      showToast('Recovery', 'Reconnecting...', 'warning');
    } else if (event.action === 'reinvite_succeeded') {
      showToast('Recovery', 'Connection restored', 'success');
    } else if (event.action === 'max_attempts_reached') {
      showToast('Recovery', 'Connection lost', 'error');
    }
  });

  // Manual trigger: Request Keyframe
  DOM.requestKeyframeBtn.onclick = () => {
    call.requestKeyframe();
    flashSentFeedback(DOM.requestKeyframeText, 'Request Keyframe');
  };

  // Manual trigger: Request ICE Restart
  DOM.requestIceRestartBtn.onclick = async () => {
    try {
      await call.requestIceRestart();
      flashSentFeedback(DOM.requestIceRestartText, 'Request ICE Restart');
    } catch (error) {
      console.error('Error requesting ICE restart:', error);
      showToast('ICE Restart Error', (error as Error).message, 'error');
    }
  };

  // Quality overlay click -> switch to Stats tab
  DOM.qualityOverlay.onclick = () => {
    DOM.tabNav.forEach((t) => t.classList.remove('active'));
    DOM.tabContents.forEach((c) => c.classList.remove('active'));
    const statsTab = document.querySelector('.tab[data-tab="stats"]');
    const statsContent = document.getElementById('tabStats');
    if (statsTab) statsTab.classList.add('active');
    if (statsContent) statsContent.classList.add('active');
  };
};

// Helper function to subscribe to participant observables
const subscribeToParticipantObservables = (
  participant: CallParticipant,
  element: HTMLDivElement
) => {
  const updateParticipantUI = () => {
    const isSelf = false; // Self participant is handled separately via call.self$

    // Clone the template content
    const template = DOM.participantTemplate.content.cloneNode(true) as DocumentFragment;

    // Update the template with participant-specific classes/IDs
    const nameElement = template.querySelector('.participant-name') as HTMLElement;
    const typeElement = template.querySelector('.participant-type') as HTMLElement;
    const selfBadge = template.querySelector('.participant-self-badge') as HTMLElement;
    const talkingElement = template.querySelector('.participant-talking') as HTMLElement;
    const handraisedElement = template.querySelector('.participant-handraised') as HTMLElement;
    const audioElement = template.querySelector('.participant-audio') as HTMLElement;
    const videoElement = template.querySelector('.participant-video') as HTMLElement;
    const visibleElement = template.querySelector('.participant-visible') as HTMLElement;
    const deafElement = template.querySelector('.participant-deaf') as HTMLElement;
    const positionElement = template.querySelector('.participant-position') as HTMLElement;
    const layerElement = template.querySelector('.participant-layer') as HTMLElement;
    const zindexElement = template.querySelector('.participant-zindex') as HTMLElement;
    const xElement = template.querySelector('.participant-x') as HTMLElement;
    const yElement = template.querySelector('.participant-y') as HTMLElement;
    const sizeElement = template.querySelector('.participant-size') as HTMLElement;
    const heightElement = template.querySelector('.participant-height') as HTMLElement;
    const widthElement = template.querySelector('.participant-width') as HTMLElement;
    const playingElement = template.querySelector('.participant-playing') as HTMLElement;
    const reservationElement = template.querySelector('.participant-reservation') as HTMLElement;
    const positionVisibleElement = template.querySelector(
      '.participant-position-visible'
    ) as HTMLElement;

    // Set IDs for easier access later
    nameElement.id = `${participant.id}-name`;
    typeElement.id = `${participant.id}-type`;
    talkingElement.id = `${participant.id}-talking`;
    handraisedElement.id = `${participant.id}-handraised`;
    audioElement.id = `${participant.id}-audio`;
    videoElement.id = `${participant.id}-video`;
    visibleElement.id = `${participant.id}-visible`;
    deafElement.id = `${participant.id}-deaf`;
    positionElement.id = `${participant.id}-position`;
    layerElement.id = `${participant.id}-layer`;
    zindexElement.id = `${participant.id}-zindex`;
    xElement.id = `${participant.id}-x`;
    yElement.id = `${participant.id}-y`;
    sizeElement.id = `${participant.id}-size`;
    heightElement.id = `${participant.id}-height`;
    widthElement.id = `${participant.id}-width`;
    playingElement.id = `${participant.id}-playing`;
    reservationElement.id = `${participant.id}-reservation`;
    positionVisibleElement.id = `${participant.id}-position-visible`;

    // Show self badge if this is the current user
    if (isSelf) {
      selfBadge.classList.add('visible');
    }

    // Clear element and append template
    element.innerHTML = '';
    element.appendChild(template);
  };

  updateParticipantUI();

  // Subscribe to name
  participant.name$.subscribe((name) => {
    const nameElement = document.getElementById(`${participant.id}-name`);
    if (nameElement) nameElement.textContent = name ?? 'Unknown';
  });

  // Subscribe to type
  participant.type$.subscribe((type) => {
    const typeElement = document.getElementById(`${participant.id}-type`);
    if (typeElement) typeElement.textContent = `Type: ${type || 'Unknown'}`;
  });

  // Subscribe to audio muted
  participant.audioMuted$.subscribe((muted) => {
    const audioElement = document.getElementById(`${participant.id}-audio`);
    if (audioElement) {
      audioElement.innerHTML = muted
        ? '<span class="text-error">Muted</span>'
        : '<span class="text-success">Active</span>';
    }
  });

  // Subscribe to video muted
  participant.videoMuted$.subscribe((muted) => {
    const videoElement = document.getElementById(`${participant.id}-video`);
    if (videoElement) {
      videoElement.innerHTML = muted
        ? '<span class="text-error">Off</span>'
        : '<span class="text-success">On</span>';
    }
  });

  // Subscribe to visible
  participant.visible$.subscribe((visible) => {
    const visibleElement = document.getElementById(`${participant.id}-visible`);
    if (visibleElement) {
      visibleElement.innerHTML = visible
        ? '<span class="text-success">Yes</span>'
        : '<span class="text-subtle">No</span>';
    }
  });

  // Subscribe to deaf
  participant.deaf$.subscribe((deaf) => {
    const deafElement = document.getElementById(`${participant.id}-deaf`);
    if (deafElement) {
      deafElement.innerHTML = deaf
        ? '<span class="text-error">Yes</span>'
        : '<span class="text-success">No</span>';
    }
  });

  // Subscribe to hand raised
  participant.handraised$.subscribe((handraised) => {
    const handraisedElement = document.getElementById(`${participant.id}-handraised`);
    if (handraisedElement) {
      if (handraised) {
        handraisedElement.classList.remove('hidden');
      } else {
        handraisedElement.classList.add('hidden');
      }
    }
  });

  // Subscribe to talking
  participant.isTalking$.subscribe((isTalking) => {
    const talkingElement = document.getElementById(`${participant.id}-talking`);
    if (talkingElement) {
      if (isTalking) {
        talkingElement.classList.remove('hidden');
      } else {
        talkingElement.classList.add('hidden');
      }
    }
  });

  // Subscribe to position information
  participant.position$.subscribe((position) => {
    if (position) {
      const positionElement = document.getElementById(`${participant.id}-position`);
      const layerElement = document.getElementById(`${participant.id}-layer`);
      const zindexElement = document.getElementById(`${participant.id}-zindex`);
      const xElement = document.getElementById(`${participant.id}-x`);
      const yElement = document.getElementById(`${participant.id}-y`);
      const sizeElement = document.getElementById(`${participant.id}-size`);
      const positionVisibleElement = document.getElementById(`${participant.id}-position-visible`);
      const heightElement = document.getElementById(`${participant.id}-height`);
      const widthElement = document.getElementById(`${participant.id}-width`);
      const playingElement = document.getElementById(`${participant.id}-playing`);
      const reservationElement = document.getElementById(`${participant.id}-reservation`);

      if (positionElement) {
        positionElement.textContent = position.position || 'N/A';
      }
      if (layerElement) {
        layerElement.textContent = position.layer_index?.toString() || 'N/A';
      }
      if (zindexElement) {
        zindexElement.textContent = position.z_index?.toString() || 'N/A';
      }
      if (xElement) {
        xElement.textContent = position.x?.toString() || 'N/A';
      }
      if (yElement) {
        yElement.textContent = position.y?.toString() || 'N/A';
      }
      if (sizeElement) {
        sizeElement.textContent =
          position.width && position.height ? `${position.width}x${position.height}` : 'N/A';
      }
      if (heightElement) {
        heightElement.textContent = position.height?.toString() || 'N/A';
      }
      if (widthElement) {
        widthElement.textContent = position.width?.toString() || 'N/A';
      }
      if (playingElement) {
        playingElement.textContent = position.playing_file ? 'Yes' : 'No';
      }
      if (reservationElement) {
        reservationElement.textContent = position.reservation || 'N/A';
      }
      if (positionVisibleElement) {
        positionVisibleElement.innerHTML = position.visible
          ? '<span class="text-success">Yes</span>'
          : '<span class="text-subtle">No</span>';
      }
    }
  });
};

// Track current ringing call for the modal
let currentRingingCall: Call | null = null;

// Helper function to show incoming call modal
const showIncomingCallModal = (incomingCall: Call) => {
  currentRingingCall = incomingCall;

  // Get caller info from the call's address
  const callerName = 'Unknown Caller'; // incomingCall.address?.displayName || 'Unknown Caller';
  const callerAddress = 'Unknown'; // incomingCall.destinationURI || incomingCall.address?.id || 'Unknown';

  // Update modal content
  DOM.incomingCallInitials.textContent = getInitials(callerName);
  DOM.incomingCallName.textContent = callerName;
  DOM.incomingCallAddress.textContent = callerAddress;

  // Set media toggles from the call's media directions
  const directions = incomingCall.mediaDirections;
  const canSendAudio = directions.audio.includes('recv');
  const canSendVideo = directions.video.includes('recv');

  DOM.incomingAudioToggle.checked = canSendAudio;
  DOM.incomingAudioToggle.disabled = !canSendAudio;
  DOM.incomingAudioLabel.classList.toggle('disabled', !canSendAudio);

  DOM.incomingVideoToggle.checked = canSendVideo;
  DOM.incomingVideoToggle.disabled = !canSendVideo;
  DOM.incomingVideoLabel.classList.toggle('disabled', !canSendVideo);

  DOM.incomingCallMediaOptions.classList.remove('hidden');

  // Show modal
  DOM.incomingCallModal.classList.add('visible');

  console.log('Showing incoming call modal for:', callerName, callerAddress);
};

// Helper function to hide incoming call modal
const hideIncomingCallModal = () => {
  DOM.incomingCallModal.classList.remove('visible');
  currentRingingCall = null;
};

// Subscribe to incoming calls and show modal for ringing calls
const subscribeToIncomingCalls = () => {
  // Subscribe to incoming calls list
  client!.session.incomingCalls$.subscribe((incomingCalls: Call[]) => {
    console.log('Incoming calls updated:', incomingCalls);

    // Find calls that are ringing
    const ringingCalls = incomingCalls.filter((c) => c.status === 'ringing');

    if (ringingCalls.length > 0 && !currentRingingCall) {
      // Show modal for the first ringing call
      const ringingCall = ringingCalls[0];
      showIncomingCallModal(ringingCall);

      // Subscribe to this call's status to hide modal when no longer ringing
      ringingCall.status$.pipe(filter((status) => status !== 'ringing')).subscribe(() => {
        if (currentRingingCall?.id === ringingCall.id) {
          hideIncomingCallModal();
        }
      });
    } else if (ringingCalls.length === 0 && currentRingingCall) {
      // No more ringing calls, hide modal
      hideIncomingCallModal();
    }
  });

  // Accept button handler
  DOM.acceptCallButton.onclick = () => {
    if (currentRingingCall) {
      // Pass user-selected media options from the toggles
      const answerOptions = {
        audio: DOM.incomingAudioToggle.checked,
        video: DOM.incomingVideoToggle.checked
      };
      console.log('Accepting incoming call:', currentRingingCall.id, answerOptions);
      currentRingingCall.answer(answerOptions);

      // Set this as the active call and subscribe to its observables
      call = currentRingingCall;
      subscribeToCallObservables(call);

      hideIncomingCallModal();
    }
  };

  // Reject button handler
  DOM.rejectCallButton.onclick = () => {
    if (currentRingingCall) {
      console.log('Rejecting incoming call:', currentRingingCall.id);
      currentRingingCall.reject();
      hideIncomingCallModal();
    }
  };
};

// ============================================================
// AUTH SCREEN UI
// ============================================================

const AUTH_METHOD_LABELS: Record<string, string> = {
  [AUTH_METHODS.USER]: 'User',
  [AUTH_METHODS.BUILD_TIME]: 'Build Token'
};

function showAuthModal(): void {
  DOM.authModal.style.display = 'flex';
}

function hideAuthModal(): void {
  DOM.authModal.style.display = 'none';
}

function showMainApp(authMethod: AuthMethod): void {
  hideAuthModal();
  DOM.authMethodBadge.textContent = AUTH_METHOD_LABELS[authMethod] || authMethod;
}

function showAuthError(message: string): void {
  DOM.authError.textContent = message;
  DOM.authError.classList.add('visible');
  DOM.authLoading.classList.remove('visible');
}

function hideAuthError(): void {
  DOM.authError.classList.remove('visible');
}

function showAuthLoading(): void {
  DOM.authLoading.classList.add('visible');
  DOM.authError.classList.remove('visible');
}

function hideAuthLoading(): void {
  DOM.authLoading.classList.remove('visible');
}

// ============================================================
// INITIALIZE APP (deferred until after authentication)
// ============================================================

function initializeApp(
  credentialProvider:
    | InstanceType<typeof StaticCredentialProvider>
    | UserCredentialProvider
    | undefined,
  authMethod: AuthMethod
): Promise<void> {
  hideAuthLoading();
  showMainApp(authMethod);

  // Create the SignalWire client.
  // reconnectAttachedCalls: the SDK stores active call IDs in sessionStorage.
  // On reload, it waits for the server to push verto.attach (the server
  // detects the reconnected session via the same protocol key).
  client = new SignalWire(credentialProvider, {
    reconnectAttachedCalls: true,
    persistSession: true,
    logLevel: 'debug',
    debug: { logWsTraffic: true }
  });
  //@ts-expect-error Expose client for console debugging
  window.client = client;

  // Subscribe to client-level errors (auth failures, transport errors)
  client.errors$.subscribe((error) => {
    logDebug('error', `Client error: ${error.message}`, { name: error.name });
    showToast('Client Error', error.message, 'error');
    // Reject the connected promise so boot flow can catch it
    rejectConnected(error);
  });

  const statusElement = DOM.statusElement;
  const clientInfoElement = DOM.clientInfoElement;
  statusElement.textContent = 'Connecting...';

  // Populate device dropdowns from device observables.
  // These run immediately on connect so the sidebar selects are populated before any call.
  // Each subscription also syncs the selected value from the SDK's current selection.
  client.audioInputDevices$.subscribe((devices: MediaDeviceInfo[]) => {
    DOM.audioInputDeviceSelect.innerHTML = '<option value="">Select audio input...</option>';
    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Audio Input ${device.deviceId.substring(0, 8)}`;
      DOM.audioInputDeviceSelect.appendChild(option);
    });
    // Sync to SDK's current selection
    const selected = client.selectedAudioInputDevice;
    if (selected) DOM.audioInputDeviceSelect.value = selected.deviceId;
  });

  client.videoInputDevices$.subscribe((devices: MediaDeviceInfo[]) => {
    DOM.videoInputDeviceSelect.innerHTML = '<option value="">Select video input...</option>';
    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Video Input ${device.deviceId.substring(0, 8)}`;
      DOM.videoInputDeviceSelect.appendChild(option);
    });
    const selected = client.selectedVideoInputDevice;
    if (selected) DOM.videoInputDeviceSelect.value = selected.deviceId;
  });

  client.audioOutputDevices$.subscribe((devices: MediaDeviceInfo[]) => {
    DOM.audioOutputDeviceSelect.innerHTML = '<option value="">Select audio output...</option>';
    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Audio Output ${device.deviceId.substring(0, 8)}`;
      DOM.audioOutputDeviceSelect.appendChild(option);
    });
    const selected = client.selectedAudioOutputDevice;
    if (selected) DOM.audioOutputDeviceSelect.value = selected.deviceId;
  });

  // Also react to SDK device selection changes (from auto-recovery, etc.)
  client.selectedAudioInputDevice$.subscribe((device) => {
    if (device) DOM.audioInputDeviceSelect.value = device.deviceId;
  });
  client.selectedVideoInputDevice$.subscribe((device) => {
    if (device) DOM.videoInputDeviceSelect.value = device.deviceId;
  });
  client.selectedAudioOutputDevice$.subscribe((device) => {
    if (device) DOM.audioOutputDeviceSelect.value = device.deviceId;
  });

  // Speaker selection
  DOM.audioOutputDeviceSelect.onchange = () => {
    const deviceId = DOM.audioOutputDeviceSelect.value;
    if (!deviceId) return;
    client.selectAudioOutputDevice(
      client.audioOutputDevices.find((d) => d.deviceId === deviceId) ?? null
    );
  };

  // Promise that resolves when the client first connects, or rejects on init error
  let resolveConnected: () => void;
  let rejectConnected: (err: Error) => void;
  const connectedPromise = new Promise<void>((resolve, reject) => {
    resolveConnected = resolve;
    rejectConnected = reject;
    // Timeout: if not connected within 15s, the token is likely expired
    setTimeout(() => reject(new Error('Connection timeout')), 15000);
  });

  // Subscribe to connection state
  client.isConnected$.subscribe((isConnected: boolean) => {
    logDebug('connection', isConnected ? 'connected' : 'disconnected');
    if (isConnected) {
      statusElement.textContent = 'Connected';
      DOM.connectionDot.classList.remove('connecting', 'disconnected');
      DOM.connectionDot.classList.add('connected');
      resolveConnected();

      // Display user info if available
      const sub = client!.user;
      if (sub) {
        clientInfoElement.innerHTML = `
          <p><strong>ID:</strong> ${sub.id || '...'}</p>
          <p><strong>Email:</strong> ${sub.email || '...'}</p>
        `;
      }

      // Subscribe to directory addresses
      subscribeToDirectory();

      // Subscribe to incoming calls
      subscribeToIncomingCalls();

      // Pick up reattached calls (from page reload with reconnectAttachedCalls)
      const existingCalls = client!.session.calls;
      if (existingCalls.length > 0 && !call) {
        console.log(`[Boot] Found ${existingCalls.length} reattached call(s)`);
        call = existingCalls[0];
        subscribeToCallObservables(call);
        showToast('Call Reattached', `Reconnected to ${call.to ?? 'active call'}`, 'success');
      }

      // Watch for calls that appear after connect via server-pushed reattach.
      // Only treat calls arriving in the first 5s after connect as reattaches —
      // after that, new calls are user-initiated dials, not reattaches.
      let expectingReattach = true;
      setTimeout(() => {
        expectingReattach = false;
      }, 5000);
      client!.session.calls$.subscribe((calls) => {
        if (calls.length > 0 && !call && expectingReattach) {
          console.log(`[Boot] Reattached call appeared: ${calls[0].to}`);
          call = calls[0];
          subscribeToCallObservables(call);
          showToast('Call Reattached', `Reconnected to ${call.to ?? 'active call'}`, 'success');
        }
      });

      const callButton = DOM.callButton;
      callButton.disabled = false;
      callButton.onclick = async () => {
        console.log('Call button clicked');
        const toAddress = DOM.toAddressInput.value.trim();
        if (toAddress !== '') {
          try {
            // Use media options from the UI checkboxes
            const sendVideo = DOM.sendVideoToggle.checked;
            const sendAudio = DOM.sendAudioToggle.checked;
            call = await client!.dial(toAddress, {
              audio: sendAudio,
              video: sendVideo,
              receiveVideo: sendVideo,
              receiveAudio: sendAudio
            });
            // Remember destination for auto-redial on reload
            storeLastDestination(toAddress);
            console.log('Call initiated:', call);
            if (call) {
              subscribeToCallObservables(call);
            }
          } catch (error) {
            console.error('Error making call:', error);
            showToast('Call Failed', (error as Error).message, 'error');
          }
        } else {
          showToast('Invalid Address', 'Please enter a valid address to call.', 'warning');
          return;
        }
      };
    } else {
      statusElement.textContent = 'Disconnected';
      DOM.connectionDot.classList.remove('connecting', 'connected');
      DOM.connectionDot.classList.add('disconnected');
    }
  });

  // Subscribe to user profile updates
  client.user$.subscribe({
    next: (user) => {
      if (user) {
        console.log('User ready:', user.email);
        clientInfoElement.innerHTML = `
          <p><strong>ID:</strong> ${user.id}</p>
          <p><strong>Email:</strong> ${user.email}</p>
        `;
      }
    },
    error: (error: Error) => {
      console.error('Error with user:', error);
      statusElement.textContent = 'Error: ' + error.message;
    }
  });

  // ===========================================================================
  // PLATFORM & DIAGNOSTICS (client-level, always available)
  // ===========================================================================

  // Display platform capabilities immediately
  const caps: PlatformCapabilities = client.platformCapabilities;
  renderPlatformCapabilities(caps);
  console.log('Platform capabilities:', caps);

  // Subscribe to device recovery events
  client.deviceRecovered$.subscribe((event: DeviceRecoveryEvent) => {
    logDebug('device', `${event.kind} switched: ${event.reason}`, {
      previous: event.previousDevice?.label,
      new: event.newDevice?.label,
      reason: event.reason
    });
    // Show toast for device recovery
    const deviceLabel = event.newDevice?.label || 'Unknown device';
    showToast('Device Changed', `${event.kind} switched to ${deviceLabel}`, 'info');
  });

  // Export Diagnostics button — builds full debug log with events + last stats snapshot
  DOM.exportDiagnosticsBtn.onclick = () => {
    const exported = buildDebugExport();
    const json = JSON.stringify(exported, null, 2);
    console.log('Debug export:', exported);
    DOM.diagnosticsJson.textContent = json;
    DOM.diagnosticsOutput.classList.remove('hidden');

    // Copy to clipboard automatically
    navigator.clipboard
      .writeText(json)
      .then(() => {
        showToast('Copied', 'Debug log copied to clipboard', 'success');
      })
      .catch(() => {
        showToast('Export Ready', 'Debug log displayed below — select all and copy', 'info');
      });
  };

  // Collapse button for the diagnostics JSON panel
  DOM.collapseDiagnosticsBtn.onclick = () => {
    DOM.diagnosticsOutput.classList.add('hidden');
  };

  console.log('SignalWire instance:', client);

  return connectedPromise;
}

// ============================================================
// AUTH SCREEN SETUP
// ============================================================

function setupAuthModal(): void {
  // Pre-fill token input: persisted token > build-time token
  const persistedToken = getPersistedToken();
  if (persistedToken) {
    DOM.tokenInput.value = persistedToken;
    DOM.rememberMeCheckbox.checked = true;
    DOM.clearSavedBtn.classList.remove('hidden');
  } else if (buildTimeToken) {
    DOM.tokenInput.value = buildTimeToken;
  }

  // Pre-fill auto-connect checkbox
  DOM.autoConnectCheckbox.checked = getAutoConnect();

  // Pre-fill last destination
  const lastDest = getLastDestination();
  if (lastDest) {
    DOM.toAddressInput.value = lastDest;
  }

  // Tab switching
  DOM.authTabButtons.forEach((btn) => {
    btn.onclick = () => {
      const tabName = btn.dataset.tab;
      DOM.authTabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      DOM.tabToken.classList.toggle('active', tabName === 'token');
      DOM.tabUser.classList.toggle('active', tabName === 'user');
      hideAuthError();
    };
  });

  // Remember me checkbox — persist/clear token on toggle
  DOM.rememberMeCheckbox.onchange = () => {
    if (DOM.rememberMeCheckbox.checked) {
      const token = DOM.tokenInput.value.trim();
      if (token) {
        persistToken(token, AUTH_METHODS.BUILD_TIME);
        DOM.clearSavedBtn.classList.remove('hidden');
      }
    } else {
      clearPersistedToken();
      setAutoConnect(false);
      DOM.autoConnectCheckbox.checked = false;
      DOM.clearSavedBtn.classList.add('hidden');
    }
  };

  // Auto-connect checkbox — requires remember me
  DOM.autoConnectCheckbox.onchange = () => {
    setAutoConnect(DOM.autoConnectCheckbox.checked);
    if (DOM.autoConnectCheckbox.checked && !DOM.rememberMeCheckbox.checked) {
      DOM.rememberMeCheckbox.checked = true;
      const token = DOM.tokenInput.value.trim();
      if (token) {
        persistToken(token, AUTH_METHODS.BUILD_TIME);
        DOM.clearSavedBtn.classList.remove('hidden');
      }
    }
  };

  // Clear saved button
  DOM.clearSavedBtn.onclick = () => {
    clearAllPersisted();
    DOM.rememberMeCheckbox.checked = false;
    DOM.autoConnectCheckbox.checked = false;
    DOM.clearSavedBtn.classList.add('hidden');
    DOM.tokenInput.value = buildTimeToken ?? '';
    DOM.toAddressInput.value = '';
    console.log('Cleared all persisted state');
  };

  // Token sign-in button
  DOM.tokenSignInBtn.onclick = () => {
    const token = DOM.tokenInput.value.trim();
    if (!token) {
      showAuthError('Please enter a SAT token.');
      return;
    }
    hideAuthError();
    showAuthLoading();
    // Clear stale cached credentials before new login
    for (const store of [sessionStorage, localStorage]) {
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key?.startsWith('sw:')) store.removeItem(key);
      }
    }
    storeToken(token, AUTH_METHODS.BUILD_TIME);
    // Persist if remember me is checked
    if (DOM.rememberMeCheckbox.checked) {
      persistToken(token, AUTH_METHODS.BUILD_TIME);
    }
    const provider = new StaticCredentialProvider({ token });
    initializeApp(provider, AUTH_METHODS.BUILD_TIME).catch((error) => {
      if (client) {
        client.destroy();
        client = null;
      }
      clearToken();
      clearPersistedToken();
      hideAuthLoading();
      showAuthError((error as Error).message);
      showAuthModal();
    });
  };

  // User sign-in form
  DOM.userForm.onsubmit = async (e: Event) => {
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
      // Clear stale cached credentials before new login
      for (const store of [sessionStorage, localStorage]) {
        for (let i = store.length - 1; i >= 0; i--) {
          const key = store.key(i);
          if (key?.startsWith('sw:')) store.removeItem(key);
        }
      }
      const provider = new UserCredentialProvider({ reference, password });

      initializeApp(provider, AUTH_METHODS.USER).catch((error) => {
        if (client) {
          client.destroy();
          client = null;
        }
        hideAuthLoading();
        showAuthError((error as Error).message);
        showAuthModal();
      });
    } catch (error) {
      hideAuthLoading();
      showAuthError((error as Error).message);
    }
  };

  // Sign out button
  DOM.signOutBtn.onclick = () => {
    clearToken();
    clearAllPersisted();
    // Clear SDK session state from both storage scopes
    for (const store of [sessionStorage, localStorage]) {
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key?.startsWith('sw:')) store.removeItem(key);
      }
    }
    DOM.rememberMeCheckbox.checked = false;
    DOM.autoConnectCheckbox.checked = false;
    DOM.clearSavedBtn.classList.add('hidden');
    if (client) {
      client.destroy();
      client = null;
    }
    showAuthModal();
  };
}

// ============================================================
// BOOT — Check for build-time token or show auth screen
// ============================================================

setupAuthModal();

// Boot priority:
// 1. Build-time token (dev workflow, SAT_TOKEN env var)
// 2. Persisted token with auto-reconnect (reattach testing)
// 3. Persisted token without auto-reconnect (pre-fill auth modal)
// 4. Show auth modal

const persistedToken = getPersistedToken();
const persistedMethod = getPersistedAuthMethod() as AuthMethod | null;

if (buildTimeToken) {
  // Auto-login with build-time token (preserves original behavior for dev workflow)
  const provider = new StaticCredentialProvider({ token: buildTimeToken });
  storeToken(buildTimeToken, AUTH_METHODS.BUILD_TIME);
  initializeApp(provider, AUTH_METHODS.BUILD_TIME);
} else {
  // Try to restore session from SDK cache (persistSession stored credential
  // in localStorage + DPoP key in IndexedDB on previous login).
  // Pass undefined as provider — SDK uses cached credential if available.
  console.log('[Boot] Attempting session restore from SDK cache');
  showAuthLoading();
  initializeApp(undefined, persistedMethod ?? AUTH_METHODS.BUILD_TIME).catch((err) => {
    console.log('[Boot] No cached session, showing auth modal:', err.message);
    if (client) {
      client.destroy();
      client = null;
    }
    hideAuthLoading();
    showAuthModal();
  });
}
