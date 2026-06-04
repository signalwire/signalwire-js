/**
 * Click-to-Call View Component
 * Showcases the sw-click-to-call widget for embedded call functionality
 *
 * This view demonstrates:
 * 1. Pre-configured destination input for quick calling
 * 2. Customizable button label
 * 3. Audio-only mode option
 * 4. Widget states: idle, connecting, connected
 *
 * @see sw-click-to-call component from @signalwire/web-components
 */

// Default configuration values
const CLICK_TO_CALL_DEFAULTS = {
  destination: '',
  label: 'Call',
  audioOnly: true
};

/**
 * Renders the Click-to-Call View
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} state - Application state containing signalWire
 */
export function renderClickToCallView(container, state) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="click-to-call-view">
      <h1>Quick Call</h1>
      <p class="view-description">
        Use the <code>sw-click-to-call</code> widget to initiate calls with a single click.
        Configure the destination and options below.
      </p>

      <!-- Configuration Panel -->
      <div class="config-section">
        <h2>Configuration</h2>

        <!-- Destination Input -->
        <div class="config-field">
          <label for="destination-input">
            Destination
            <span class="field-hint">Enter address name or resource to call</span>
          </label>
          <input
            type="text"
            id="destination-input"
            class="text-input"
            placeholder="e.g., support, +15551234567, room@example.com"
            aria-describedby="destination-hint"
          />
          <small id="destination-hint" class="field-description">
            The address from your directory or a full SIP URI
          </small>
        </div>

        <!-- Label Input -->
        <div class="config-field">
          <label for="label-input">
            Button Label
            <span class="field-hint">Text displayed on the call button</span>
          </label>
          <input
            type="text"
            id="label-input"
            class="text-input"
            placeholder="e.g., Call Support"
            value="${CLICK_TO_CALL_DEFAULTS.label}"
          />
        </div>

        <!-- Audio Only Checkbox -->
        <div class="config-field checkbox-field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              id="audio-only-checkbox"
              ${CLICK_TO_CALL_DEFAULTS.audioOnly ? 'checked' : ''}
            />
            <span class="checkbox-text">Audio Only</span>
            <span class="field-hint">Disable video for audio-only calls</span>
          </label>
        </div>
      </div>

      <!-- Widget Demo Section -->
      <div class="widget-section">
        <h2>Widget Demo</h2>
        <p class="section-description">
          The widget below shows the current state. Click to initiate a call to the configured destination.
        </p>

        <!-- Click-to-Call Widget Container -->
        <div class="widget-container">
          <sw-click-to-call
            id="click-to-call-widget"
            destination="${CLICK_TO_CALL_DEFAULTS.destination}"
            label="${CLICK_TO_CALL_DEFAULTS.label}"
            ${CLICK_TO_CALL_DEFAULTS.audioOnly ? 'audio-only' : ''}
          ></sw-click-to-call>
        </div>

        <!-- Status Display -->
        <div id="widget-status" class="widget-status" role="status" aria-live="polite">
          <span class="status-indicator idle" aria-hidden="true"></span>
          <span class="status-text">Ready to call</span>
        </div>
      </div>

      <!-- Usage Info Section -->
      <div class="info-section">
        <h2>How to Use</h2>
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">1</div>
            <div class="info-content">
              <h3>Configure Destination</h3>
              <p>Enter the address or resource you want to call in the destination field.</p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon">2</div>
            <div class="info-content">
              <h3>Customize Label</h3>
              <p>Set a custom button label like "Call Support" or "Contact Sales".</p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon">3</div>
            <div class="info-content">
              <h3>Click to Call</h3>
              <p>Click the button to initiate the call. The widget will show call status and controls.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .click-to-call-view {
      max-width: 800px;
    }

    .click-to-call-view h1 {
      margin-bottom: var(--space-sm);
    }

    .click-to-call-view h2 {
      font-size: var(--font-size-h2);
      margin-bottom: var(--space-md);
      color: var(--color-text-primary);
    }

    .view-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
    }

    .view-description code {
      background-color: var(--color-surface);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-caption);
    }

    /* Configuration Section */
    .config-section {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .config-field {
      margin-bottom: var(--space-lg);
    }

    .config-field:last-child {
      margin-bottom: 0;
    }

    .config-field label {
      display: block;
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--space-xs);
      color: var(--color-text-primary);
    }

    .field-hint {
      font-weight: normal;
      color: var(--color-text-secondary);
      font-size: var(--font-size-caption);
      margin-left: var(--space-sm);
    }

    .field-description {
      display: block;
      color: var(--color-text-secondary);
      font-size: var(--font-size-caption);
      margin-top: var(--space-xs);
    }

    .text-input {
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: var(--font-size-body);
      font-family: inherit;
      background-color: var(--color-background);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .text-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(4, 78, 245, 0.1);
    }

    .text-input::placeholder {
      color: var(--color-text-secondary);
      opacity: 0.6;
    }

    /* Checkbox Field */
    .checkbox-field {
      margin-top: var(--space-md);
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }

    .checkbox-text {
      font-weight: var(--font-weight-semibold);
    }

    /* Widget Section */
    .widget-section {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .section-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
    }

    .widget-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-xl);
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      min-height: 100px;
    }

    /* Widget Status Display */
    .widget-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      margin-top: var(--space-md);
      padding: var(--space-sm);
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-text-secondary);
    }

    .status-indicator.idle {
      background-color: #9ca3af;
    }

    .status-indicator.connecting {
      background-color: var(--color-warning);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-indicator.connected {
      background-color: var(--color-success);
    }

    .status-indicator.error {
      background-color: var(--color-danger);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Info Section */
    .info-section {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-md);
    }

    .info-card {
      display: flex;
      gap: var(--space-md);
      padding: var(--space-md);
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .info-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background-color: var(--color-primary);
      color: white;
      border-radius: 50%;
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-body);
      flex-shrink: 0;
    }

    .info-content h3 {
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--space-xs);
    }

    .info-content p {
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Setup event handlers and connect widget
  setupClickToCallWidget(container, state);
}

/**
 * Setup event handlers for the Click-to-Call widget configuration
 * @param {HTMLElement} container - The container element
 * @param {Object} state - Application state
 */
function setupClickToCallWidget(container, state) {
  // Get DOM elements
  const widget = container.querySelector('#click-to-call-widget');
  const destinationInput = container.querySelector('#destination-input');
  const labelInput = container.querySelector('#label-input');
  const audioOnlyCheckbox = container.querySelector('#audio-only-checkbox');
  const statusIndicator = container.querySelector('.status-indicator');
  const statusText = container.querySelector('.status-text');

  // sw-click-to-call is a self-contained embed widget — it manages its own
  // SignalWire connection internally via the `token` property. Pass the same
  // token used to authenticate the app so the widget can dial. Typical embed
  // usage on a third-party site would instead use a narrow-scope c2c token.
  if (widget && state.authToken) {
    widget.token = state.authToken;
  }


  /**
   * Update the status display
   * @param {string} status - Status type: idle, connecting, connected, error
   * @param {string} message - Status message to display
   */
  const updateStatus = (status, message) => {
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator ' + status;
    }
    if (statusText) {
      statusText.textContent = message;
    }
  };

  // Destination input handler - update widget destination
  if (destinationInput && widget) {
    destinationInput.addEventListener('input', () => {
      const destination = destinationInput.value.trim();
      widget.destination = destination;

      // Update status based on destination
      if (destination) {
        updateStatus('idle', `Ready to call ${destination}`);
      } else {
        updateStatus('idle', 'Enter a destination to enable calling');
      }
    });

    // Set initial status
    if (!destinationInput.value) {
      updateStatus('idle', 'Enter a destination to enable calling');
    }
  }

  // Label input handler - update widget label
  if (labelInput && widget) {
    labelInput.addEventListener('input', () => {
      widget.label = labelInput.value || CLICK_TO_CALL_DEFAULTS.label;
    });
  }

  // Audio-only checkbox handler - toggle audio-only mode
  if (audioOnlyCheckbox && widget) {
    audioOnlyCheckbox.addEventListener('change', () => {
      widget.audioOnly = audioOnlyCheckbox.checked;
    });
  }

  // Listen for widget events
  if (widget) {
    // Call initiated
    widget.addEventListener('sw-dial', (event) => {
      console.log('[ClickToCallView] Call initiated:', event.detail);
      updateStatus('connecting', `Connecting to ${event.detail.destination}...`);
    });

    // Call connected (listen to internal status changes)
    // Note: sw-click-to-call handles its own status internally,
    // but we update our external status display for consistency

    // Call ended
    widget.addEventListener('sw-call-hangup', () => {
      console.log('[ClickToCallView] Call ended');
      const destination = destinationInput?.value.trim();
      if (destination) {
        updateStatus('idle', `Ready to call ${destination}`);
      } else {
        updateStatus('idle', 'Enter a destination to enable calling');
      }
    });

    // Mute toggle
    widget.addEventListener('sw-mute-toggle', (event) => {
      console.log('[ClickToCallView] Mute toggled:', event.detail.muted);
    });
  }

  // Store cleanup function on container
  container._clickToCallCleanup = () => {
    // No cleanup needed currently
  };
}
