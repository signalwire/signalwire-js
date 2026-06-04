/**
 * Call View Component
 * Displays active call with remote video, self video, controls, and participant controls panel.
 *
 * Features:
 * - Remote video display (sw-call-media)
 * - Self video display (sw-self-media)
 * - Call controls (sw-call-controls)
 * - Call status display (sw-call-status)
 * - Participant overlays (sw-participants)
 * - Clickable participant list panel
 * - Participant controls panel (sw-participant-controls)
 */

/**
 * Renders the Call View
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} state - Application state containing activeCall and selectedParticipant
 */
export function renderCallView(container, state) {
  const call = state.activeCall;
  if (!call) return;

  const template = document.createElement('template');
  template.innerHTML = `
    <sw-call-provider id="call-provider">
      <div class="call-view">
        <div class="call-header">
          <sw-call-status></sw-call-status>
          <!-- Toggle button for participant list panel -->
          <button id="toggle-participants-btn" class="participants-toggle-btn" aria-label="Show participants">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span id="participant-count">0</span>
          </button>
        </div>

        <div class="call-media-container">
          <sw-call-media class="remote-media">
            <sw-participants class="participants-overlay"></sw-participants>
            <sw-self-media class="self-media" mirrored></sw-self-media>
          </sw-call-media>
        </div>

        <!-- Participant List Panel (slides in from left) -->
        <div id="participants-panel" class="participants-panel" aria-hidden="true">
          <div class="participants-panel-header">
            <h3>Participants</h3>
            <button id="close-participants-panel" class="close-panel-btn" aria-label="Close participants panel">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <ul id="participants-list" class="participants-list" role="listbox" aria-label="Call participants">
            <!-- Participants will be dynamically added here -->
          </ul>
        </div>

        <!-- Participant Controls Panel (slides in from right) -->
        <div id="participant-controls-panel" class="participant-controls-panel" aria-hidden="true">
          <div class="controls-panel-header">
            <h3>Participant Controls</h3>
            <button id="close-controls-panel" class="close-panel-btn" aria-label="Close participant controls">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div id="participant-controls-container">
            <sw-participant-controls id="participant-controls" data-theme="dark"></sw-participant-controls>
          </div>
        </div>

        <div class="call-footer">
          <sw-call-controls></sw-call-controls>
        </div>
      </div>
    </sw-call-provider>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .call-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .call-header {
      padding: var(--space-md) var(--space-lg);
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
    }

    .participants-toggle-btn {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm);
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      cursor: pointer;
      transition: background-color var(--transition-fast);
      font-size: var(--font-size-caption);
    }

    .participants-toggle-btn:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .participants-toggle-btn svg {
      width: 18px;
      height: 18px;
    }

    .call-media-container {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      /* Prefer 16:9 aspect ratio for video calls */
      aspect-ratio: 16 / 9;
      max-height: 100%;
      margin: 0 auto;
    }

    .remote-media {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* Contain maintains aspect ratio while filling available space */
      object-fit: contain;
      /* Center the video content */
      object-position: center;
    }

    .participants-overlay {
      /* Positioned within sw-call-media's .mcu-layers slot */
      /* No additional positioning needed - overlays use percentage-based positioning from layoutLayers */
    }

    .self-media {
      /* Positioned within sw-call-media's .mcu-layers slot */
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 200px;
      height: 150px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      z-index: 10;
      pointer-events: auto; /* Enable interaction since parent .mcu-layers has pointer-events: none */
    }

    .call-footer {
      padding: var(--space-lg);
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
    }

    /* Participant List Panel */
    .participants-panel {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background-color: rgba(31, 41, 55, 0.95);
      backdrop-filter: blur(8px);
      transform: translateX(-100%);
      transition: transform var(--transition-normal);
      z-index: 100;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .participants-panel.open {
      transform: translateX(0);
    }

    .participants-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .participants-panel-header h3 {
      color: white;
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }

    .close-panel-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background-color: transparent;
      border: none;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .close-panel-btn:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .close-panel-btn svg {
      width: 18px;
      height: 18px;
    }

    .participants-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-sm);
      margin: 0;
      list-style: none;
    }

    .participant-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      border-radius: 8px;
      cursor: pointer;
      transition: background-color var(--transition-fast);
      color: white;
    }

    .participant-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .participant-item.selected {
      background-color: var(--color-primary);
    }

    .participant-item.is-self {
      opacity: 0.7;
      cursor: default;
    }

    .participant-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-semibold);
      flex-shrink: 0;
    }

    .participant-info {
      flex: 1;
      min-width: 0;
    }

    .participant-name {
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .participant-indicators {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .participant-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.1);
    }

    .participant-indicator svg {
      width: 12px;
      height: 12px;
    }

    .participant-indicator.muted {
      background-color: var(--color-danger);
    }

    .participant-type {
      font-size: var(--font-size-caption);
      color: rgba(255, 255, 255, 0.6);
    }

    /* Participant Controls Panel */
    .participant-controls-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      background-color: rgba(31, 41, 55, 0.95);
      backdrop-filter: blur(8px);
      transform: translateX(100%);
      transition: transform var(--transition-normal);
      z-index: 100;
      display: flex;
      flex-direction: column;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }

    .participant-controls-panel.open {
      transform: translateX(0);
    }

    .controls-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .controls-panel-header h3 {
      color: white;
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }

    #participant-controls-container {
      flex: 1;
      padding: var(--space-md);
      overflow-y: auto;
    }

    /* Empty state */
    .empty-participants {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-xl);
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
    }

    .empty-participants svg {
      width: 48px;
      height: 48px;
      margin-bottom: var(--space-md);
      opacity: 0.5;
    }

    /* Responsive adjustments - Tablet (768px - 1024px) */
    @media (min-width: 768px) and (max-width: 1024px) {
      .self-media {
        /* Intermediate size for tablet - positioned within sw-call-media slot */
        width: 160px;
        height: 120px;
        bottom: 12px;
        right: 12px;
      }

      .call-header {
        padding: var(--space-sm) var(--space-md);
      }

      .call-footer {
        padding: var(--space-md);
      }

      .call-media-container {
        /* Allow more flexibility on tablet */
        aspect-ratio: auto;
      }
    }

    /* Responsive adjustments - Mobile (<768px) */
    @media (max-width: 767px) {
      .self-media {
        /* Smaller size for mobile - positioned within sw-call-media slot */
        width: 120px;
        height: 90px;
        bottom: 8px;
        right: 8px;
      }

      .participants-panel,
      .participant-controls-panel {
        width: 100%;
      }

      .call-header {
        padding: var(--space-sm) var(--space-md);
      }

      .call-footer {
        padding: var(--space-md);
      }

      .call-media-container {
        /* Remove aspect ratio constraint on mobile for better space usage */
        aspect-ratio: auto;
      }

      /* participants-overlay is now inside sw-call-media, no positioning overrides needed */
    }

    /* Large desktop (>1200px) - ensure video doesn't get too stretched */
    @media (min-width: 1200px) {
      .call-media-container {
        max-width: calc(100vh * 16 / 9);
      }
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Wire the call into the context provider so all child components receive it
  const callProvider = container.querySelector('#call-provider');
  if (callProvider) {
    callProvider.call = call;
  }

  // Handle hangup and screen share events that bubble up from sw-call-controls
  container.addEventListener('sw-call-hangup', () => {
    call.hangup();
    state.activeCall = null;
    state.selectedParticipant = null;
  });

  container.addEventListener('sw-screen-share', (event) => {
    console.log('[CallView] Screen share toggled:', event.detail);
  });

  // Setup participant panels
  setupParticipantPanels(container, state, call);
}

/**
 * Setup participant list panel and controls panel functionality
 * @param {HTMLElement} container - The container element
 * @param {Object} state - Application state
 * @param {Object} call - The active call object
 */
function setupParticipantPanels(container, state, call) {
  // Get panel elements
  const toggleBtn = container.querySelector('#toggle-participants-btn');
  const participantCount = container.querySelector('#participant-count');
  const participantsPanel = container.querySelector('#participants-panel');
  const closeParticipantsBtn = container.querySelector('#close-participants-panel');
  const participantsList = container.querySelector('#participants-list');
  const controlsPanel = container.querySelector('#participant-controls-panel');
  const closeControlsBtn = container.querySelector('#close-controls-panel');
  const participantControls = container.querySelector('#participant-controls');

  // Track subscriptions for cleanup
  const subscriptions = [];

  // Track current participants for rendering
  let currentParticipants = [];
  let selfId = call.self?.id;

  /**
   * Toggle participants panel visibility
   */
  const toggleParticipantsPanel = () => {
    const isOpen = participantsPanel.classList.contains('open');
    if (isOpen) {
      participantsPanel.classList.remove('open');
      participantsPanel.setAttribute('aria-hidden', 'true');
    } else {
      participantsPanel.classList.add('open');
      participantsPanel.setAttribute('aria-hidden', 'false');
    }
  };

  /**
   * Close participants panel
   */
  const closeParticipantsPanel = () => {
    participantsPanel.classList.remove('open');
    participantsPanel.setAttribute('aria-hidden', 'true');
  };

  /**
   * Open participant controls panel for a specific participant
   * @param {Object} participant - The participant to show controls for
   */
  const openControlsPanel = (participant) => {
    state.selectedParticipant = participant;

    // Connect participant controls component
    if (participantControls) {
      participantControls.participant = participant;
      // Set capabilities - remote participants can be muted and removed
      participantControls.capabilities = ['memberMuteAudio', 'memberMuteVideo', 'memberRemove'];
      participantControls.showVolume = true;
      participantControls.showPin = false;
    }

    controlsPanel.classList.add('open');
    controlsPanel.setAttribute('aria-hidden', 'false');

    // Update selected state in participant list
    updateParticipantListSelection(participant.id);
  };

  /**
   * Close participant controls panel
   */
  const closeControlsPanel = () => {
    state.selectedParticipant = null;
    controlsPanel.classList.remove('open');
    controlsPanel.setAttribute('aria-hidden', 'true');

    // Clear selection in participant list
    updateParticipantListSelection(null);
  };

  /**
   * Update the selected state of participant items in the list
   * @param {string|null} selectedId - The ID of the selected participant
   */
  const updateParticipantListSelection = (selectedId) => {
    const items = participantsList.querySelectorAll('.participant-item');
    items.forEach(item => {
      if (item.dataset.participantId === selectedId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  };

  /**
   * Render the participant list
   * @param {Array} participants - Array of participant objects
   */
  const renderParticipantList = (participants) => {
    currentParticipants = participants;

    // Update count
    if (participantCount) {
      participantCount.textContent = participants.length.toString();
    }

    // Clear existing list
    participantsList.innerHTML = '';

    if (participants.length === 0) {
      participantsList.innerHTML = `
        <li class="empty-participants">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span>No other participants</span>
        </li>
      `;
      return;
    }

    // Render each participant
    participants.forEach(participant => {
      const isSelf = participant.id === selfId;
      const isSelected = state.selectedParticipant?.id === participant.id;

      const li = document.createElement('li');
      li.className = `participant-item${isSelf ? ' is-self' : ''}${isSelected ? ' selected' : ''}`;
      li.dataset.participantId = participant.id;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', isSelected ? 'true' : 'false');

      // Get initial avatar letter from name
      const name = participant.name || 'Unknown';
      const avatarLetter = name.charAt(0).toUpperCase();

      li.innerHTML = `
        <div class="participant-avatar">${avatarLetter}</div>
        <div class="participant-info">
          <div class="participant-name">${escapeHtml(name)}${isSelf ? ' (You)' : ''}</div>
          ${participant.type ? `<div class="participant-type">${escapeHtml(participant.type)}</div>` : ''}
        </div>
        <div class="participant-indicators">
          <span class="participant-indicator${participant.audioMuted ? ' muted' : ''}" title="${participant.audioMuted ? 'Muted' : 'Unmuted'}">
            ${participant.audioMuted
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
            }
          </span>
          <span class="participant-indicator${participant.videoMuted ? ' muted' : ''}" title="${participant.videoMuted ? 'Video off' : 'Video on'}">
            ${participant.videoMuted
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>'
            }
          </span>
        </div>
      `;

      // Add click handler (only for non-self participants)
      if (!isSelf) {
        li.addEventListener('click', () => {
          openControlsPanel(participant);
        });
      }

      participantsList.appendChild(li);

      // Subscribe to participant state changes to update the list item
      if (participant.name$) {
        const nameSub = participant.name$.subscribe(newName => {
          const nameEl = li.querySelector('.participant-name');
          if (nameEl) {
            nameEl.textContent = `${newName}${isSelf ? ' (You)' : ''}`;
          }
          const avatarEl = li.querySelector('.participant-avatar');
          if (avatarEl) {
            avatarEl.textContent = newName.charAt(0).toUpperCase();
          }
        });
        subscriptions.push(nameSub);
      }

      if (participant.audioMuted$) {
        const audioSub = participant.audioMuted$.subscribe(muted => {
          const indicator = li.querySelectorAll('.participant-indicator')[0];
          if (indicator) {
            indicator.classList.toggle('muted', muted);
            indicator.title = muted ? 'Muted' : 'Unmuted';
            indicator.innerHTML = muted
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
          }
        });
        subscriptions.push(audioSub);
      }

      if (participant.videoMuted$) {
        const videoSub = participant.videoMuted$.subscribe(muted => {
          const indicator = li.querySelectorAll('.participant-indicator')[1];
          if (indicator) {
            indicator.classList.toggle('muted', muted);
            indicator.title = muted ? 'Video off' : 'Video on';
            indicator.innerHTML = muted
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
          }
        });
        subscriptions.push(videoSub);
      }
    });
  };

  // Event listeners for buttons
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleParticipantsPanel);
  }

  if (closeParticipantsBtn) {
    closeParticipantsBtn.addEventListener('click', closeParticipantsPanel);
  }

  if (closeControlsBtn) {
    closeControlsBtn.addEventListener('click', closeControlsPanel);
  }

  // Subscribe to participants observable
  if (call.participants$) {
    const participantsSub = call.participants$.subscribe(participants => {
      renderParticipantList(participants);
    });
    subscriptions.push(participantsSub);
  }

  // Subscribe to self to get the self ID
  if (call.self$) {
    const selfSub = call.self$.subscribe(self => {
      if (self) {
        selfId = self.id;
        // Re-render list with updated selfId
        renderParticipantList(currentParticipants);
      }
    });
    subscriptions.push(selfSub);
  }

  // Listen for participant control events
  if (participantControls) {
    participantControls.addEventListener('sw-participant-remove', () => {
      // Close the controls panel when a participant is removed
      closeControlsPanel();
    });
  }

  // Store cleanup function on container
  container._callViewCleanup = () => {
    subscriptions.forEach(sub => sub.unsubscribe());
    state.selectedParticipant = null;
  };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
