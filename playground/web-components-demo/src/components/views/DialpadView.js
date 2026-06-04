/**
 * Dialpad View Component
 * Shows sw-call-dialpad for manual dialing
 *
 * This component provides a numeric keypad for entering destination addresses
 * and initiating outbound calls via the SignalWire SDK.
 */

export function renderDialpadView(container, state) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="dialpad-view">
      <h1>Dialpad</h1>
      <p class="view-description">Enter a number or address to make a call.</p>

      <!-- Status message area for call feedback -->
      <div id="dialpad-status" class="dialpad-status hidden" role="status" aria-live="polite"></div>

      <div class="dialpad-container">
        <!-- sw-call-dialpad integrates with callStateContext for DTMF during active calls -->
        <sw-call-dialpad show-call-button></sw-call-dialpad>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .dialpad-view {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .dialpad-view h1 {
      margin-bottom: var(--space-sm);
      width: 100%;
    }

    .view-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
      width: 100%;
    }

    .dialpad-container {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-xl);
      max-width: 400px;
      width: 100%;
    }

    /* Call status message styling */
    .dialpad-status {
      max-width: 400px;
      width: 100%;
      padding: var(--space-md);
      border-radius: 8px;
      margin-bottom: var(--space-md);
      text-align: center;
      font-size: var(--font-size-body);
    }

    .dialpad-status.hidden {
      display: none;
    }

    .dialpad-status.calling {
      background-color: var(--color-warning);
      color: white;
    }

    .dialpad-status.error {
      background-color: var(--color-danger);
      color: white;
    }

    .dialpad-status.success {
      background-color: var(--color-success);
      color: white;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Get reference to status element for showing call feedback
  const statusEl = container.querySelector('#dialpad-status');

  // sw-call-dialpad handles DTMF automatically via callStateContext when a call is active.
  // We only need to handle the sw-dial event for initiating new outbound calls.
  const dialpad = container.querySelector('sw-call-dialpad');
  if (dialpad) {
    dialpad.addEventListener('sw-dial', async (event) => {
      const { digits } = event.detail;
      await initiateCall(state, digits, statusEl);
    });
  }
}

/**
 * Initiates an outbound call to the specified destination
 *
 * @param {AppState} state - Application state containing signalWire
 * @param {string} destination - The destination address or number to call
 * @param {HTMLElement} statusEl - Status element for showing feedback
 */
async function initiateCall(state, destination, statusEl) {
  // Validate that we're registered before attempting to dial
  if (!state.signalWire || !state.isRegistered) {
    console.error('Cannot initiate call: not registered');
    showStatus(statusEl, 'Not registered. Please wait for registration.', 'error');
    return;
  }

  // Show calling status to user
  showStatus(statusEl, `Calling ${destination}...`, 'calling');
  console.log('[DialpadView] Initiating call to:', destination);

  try {
    // dial() takes destination as first param, options as second
    // See SDK: dial(destination: string | Address, options: DialOptions = {})
    // The SDK will look up the destination in the directory and create a WebRTC call
    const call = await state.signalWire.dial(destination, {
      audio: true,
      video: true
    });

    console.log('[DialpadView] Call created successfully:', call.id);

    // Store the active call in state - this triggers UI update to show CallView
    state.activeCall = call;

    // Hide status since call view will take over
    hideStatus(statusEl);

    // Subscribe to call status changes for cleanup
    // When call ends or fails, clear the activeCall to return to dialpad view
    // Self-cleaning subscription: unsubscribe when call reaches terminal state
    const statusSub = call.status$.subscribe(status => {
      console.log('[DialpadView] Call status changed:', status);
      if (status === 'destroyed' || status === 'failed') {
        state.activeCall = null;
        statusSub.unsubscribe();
        errorSub.unsubscribe();
      }
    });

    // Subscribe to call errors — fatal errors auto-destroy the call
    const errorSub = call.errors$.subscribe(callError => {
      console.error(`[DialpadView] Call error [${callError.kind}]:`, callError.error);
      const prefix = callError.fatal ? 'Fatal call error' : 'Call error';
      showStatus(statusEl, `${prefix} [${callError.kind}]: ${callError.error.message}`, 'error');
    });
  } catch (error) {
    // Handle call initiation errors gracefully
    console.error('[DialpadView] Failed to initiate call:', error);

    // Show user-friendly error message
    const errorMessage = getCallErrorMessage(error);
    showStatus(statusEl, errorMessage, 'error');

    // Auto-hide error after 5 seconds
    setTimeout(() => hideStatus(statusEl), 5000);
  }
}

/**
 * Shows a status message with appropriate styling
 */
function showStatus(statusEl, message, type) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `dialpad-status ${type}`;
}

/**
 * Hides the status message
 */
function hideStatus(statusEl) {
  if (!statusEl) return;
  statusEl.className = 'dialpad-status hidden';
}

/**
 * Converts SDK errors to user-friendly messages
 */
function getCallErrorMessage(error) {
  const message = error?.message || String(error);

  // Handle common error cases with user-friendly messages
  if (message.includes('not found') || message.includes('Address')) {
    return 'Address not found. Please check the number and try again.';
  }
  if (message.includes('timeout')) {
    return 'Call timed out. Please try again.';
  }
  if (message.includes('permission') || message.includes('Permission')) {
    return 'Media permission denied. Please allow camera/microphone access.';
  }

  // Default error message
  return `Call failed: ${message}`;
}
