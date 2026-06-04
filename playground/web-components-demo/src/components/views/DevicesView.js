/**
 * Devices View Component
 * Shows sw-device-selector for device management and sw-audio-level demo
 *
 * This view demonstrates:
 * 1. Device selection for microphone, camera, and speaker
 * 2. Live audio level visualization using sw-audio-level component
 */

// Default values for Audio Level Demo
const AUDIO_LEVEL_DEFAULTS = {
  bars: 5,
  orientation: 'horizontal',
  maxSize: 100
};

/**
 * Renders the Devices View with device selector and audio level demo
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} state - Application state containing signalWire
 */
export function renderDevicesView(container, state) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="devices-view">
      <h1>Select Devices</h1>
      <p class="view-description">Configure your audio and video devices for calls.</p>

      <!-- Audio Level Demo Section -->
      <div class="audio-level-demo-section">
        <h2>Live Preview</h2>
        <p class="section-description">
          Preview your selected camera and microphone. Use <code>sw-local-camera</code>
          for the video feed and <code>sw-audio-level</code> for live mic levels.
          Changing devices in the selector below swaps the active tracks.
        </p>

        <!-- Camera Preview -->
        <div class="camera-preview-wrapper">
          <sw-local-camera id="local-camera" mirror></sw-local-camera>
        </div>

        <!-- Audio Level Displays -->
        <div class="audio-level-displays">
          <!-- Horizontal Layout Demo -->
          <div class="audio-level-display">
            <h3>Horizontal Layout</h3>
            <div class="audio-level-wrapper horizontal">
              <sw-audio-level
                id="audio-level-horizontal"
                orientation="horizontal"
                bars="${AUDIO_LEVEL_DEFAULTS.bars}"
                maxSize="${AUDIO_LEVEL_DEFAULTS.maxSize}"
              ></sw-audio-level>
            </div>
          </div>

          <!-- Vertical Layout Demo -->
          <div class="audio-level-display">
            <h3>Vertical Layout</h3>
            <div class="audio-level-wrapper vertical">
              <sw-audio-level
                id="audio-level-vertical"
                orientation="vertical"
                bars="${AUDIO_LEVEL_DEFAULTS.bars}"
                maxSize="${AUDIO_LEVEL_DEFAULTS.maxSize}"
              ></sw-audio-level>
            </div>
          </div>
        </div>

        <!-- Configuration Panel -->
        <div class="audio-level-config">
          <h3>Configuration</h3>
          <div class="config-controls">
            <!-- Bars Slider -->
            <div class="config-control">
              <label for="bars-slider">
                Bars: <span id="bars-value">${AUDIO_LEVEL_DEFAULTS.bars}</span>
              </label>
              <input
                type="range"
                id="bars-slider"
                min="3"
                max="10"
                value="${AUDIO_LEVEL_DEFAULTS.bars}"
                aria-label="Number of bars"
              />
            </div>

            <!-- Orientation Toggle -->
            <div class="config-control">
              <label>Orientation:</label>
              <div class="toggle-buttons" role="group" aria-label="Orientation selection">
                <button
                  id="orientation-horizontal"
                  class="toggle-btn active"
                  aria-pressed="true"
                >
                  Horizontal
                </button>
                <button
                  id="orientation-vertical"
                  class="toggle-btn"
                  aria-pressed="false"
                >
                  Vertical
                </button>
              </div>
            </div>

            <!-- Max Size Slider -->
            <div class="config-control">
              <label for="maxsize-slider">
                Max Size: <span id="maxsize-value">${AUDIO_LEVEL_DEFAULTS.maxSize}px</span>
              </label>
              <input
                type="range"
                id="maxsize-slider"
                min="50"
                max="200"
                value="${AUDIO_LEVEL_DEFAULTS.maxSize}"
                aria-label="Maximum size in pixels"
              />
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <div id="audio-level-status" class="audio-level-status" role="status" aria-live="polite">
          <span class="status-icon" aria-hidden="true">🎤</span>
          <span class="status-text">Click "Start Camera & Microphone" to enable the preview</span>
        </div>

        <!-- Microphone Control Button -->
        <button id="start-mic-btn" class="btn btn-primary">
          Start Camera & Microphone
        </button>
      </div>

      <!-- Device Selector Section (placed last so its drop-up popover has room) -->
      <div class="device-selector-container">
        <sw-device-selector show-preview></sw-device-selector>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .devices-view {
      max-width: 800px;
    }

    .devices-view h1 {
      margin-bottom: var(--space-sm);
    }

    .view-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
    }

    .device-selector-container {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
      margin-top: var(--space-lg);
      display: flex;
      justify-content: center;
    }

    /* Make the selector trigger visible on the light surface */
    .device-selector-container sw-device-selector {
      --ctrl-bg: var(--color-primary);
      --ctrl-bg-hover: #0340c9;
      --ctrl-fg: #ffffff;
      --ctrl-label-color: var(--color-text-secondary);
    }

    /* Audio Level Demo Section Styles */
    .audio-level-demo-section {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
      margin-top: var(--space-lg);
    }

    .audio-level-demo-section h2 {
      margin-bottom: var(--space-sm);
      font-size: var(--font-size-h2);
    }

    .audio-level-demo-section h3 {
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--space-sm);
      color: var(--color-text-secondary);
    }

    .section-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
      font-size: var(--font-size-body);
    }

    .section-description code {
      background-color: var(--color-background);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-caption);
    }

    /* Camera Preview */
    .camera-preview-wrapper {
      max-width: 420px;
      margin: 0 auto var(--space-lg);
      border-radius: 12px;
      overflow: hidden;
      background-color: #000;
    }

    /* Audio Level Displays */
    .audio-level-displays {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .audio-level-display {
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-md);
      text-align: center;
    }

    .audio-level-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80px;
      background-color: #1f2937;
      border-radius: 6px;
      padding: var(--space-md);
    }

    .audio-level-wrapper.horizontal {
      min-width: 150px;
    }

    .audio-level-wrapper.vertical {
      min-height: 120px;
    }

    /* Configuration Panel */
    .audio-level-config {
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .config-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-lg);
      margin-top: var(--space-md);
    }

    .config-control {
      flex: 1;
      min-width: 180px;
    }

    .config-control label {
      display: block;
      margin-bottom: var(--space-xs);
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
    }

    .config-control input[type="range"] {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--color-border);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
    }

    .config-control input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }

    .config-control input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      border: none;
    }

    /* Toggle Buttons */
    .toggle-buttons {
      display: flex;
      gap: var(--space-xs);
    }

    .toggle-btn {
      flex: 1;
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--color-border);
      background-color: var(--color-background);
      border-radius: 6px;
      font-size: var(--font-size-caption);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .toggle-btn:hover {
      border-color: var(--color-primary);
    }

    .toggle-btn.active {
      background-color: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    /* Status Message */
    .audio-level-status {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: var(--space-md);
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
    }

    .audio-level-status.active {
      border-color: var(--color-success);
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
    }

    .audio-level-status.error {
      border-color: var(--color-danger);
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-danger);
    }

    .status-icon {
      font-size: 16px;
    }

    #start-mic-btn {
      width: 100%;
    }

    #start-mic-btn.active {
      background-color: var(--color-danger);
    }

    #start-mic-btn.active:hover {
      background-color: #dc2626;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // sw-device-selector accepts deviceController directly as a property
  const deviceSelector = container.querySelector('sw-device-selector');
  if (deviceSelector && state.signalWire) {
    deviceSelector.deviceController = state.signalWire;
  }

  // Setup Audio Level Demo functionality
  setupAudioLevelDemo(container);
}

/**
 * Setup event handlers and functionality for the Audio Level Demo
 * @param {HTMLElement} container - The container element
 */
function setupAudioLevelDemo(container) {
  // Get DOM elements
  const audioLevelHorizontal = container.querySelector('#audio-level-horizontal');
  const audioLevelVertical = container.querySelector('#audio-level-vertical');
  const barsSlider = container.querySelector('#bars-slider');
  const barsValue = container.querySelector('#bars-value');
  const maxSizeSlider = container.querySelector('#maxsize-slider');
  const maxSizeValue = container.querySelector('#maxsize-value');
  const orientationHorizontal = container.querySelector('#orientation-horizontal');
  const orientationVertical = container.querySelector('#orientation-vertical');
  const startMicBtn = container.querySelector('#start-mic-btn');
  const statusElement = container.querySelector('#audio-level-status');
  const statusText = statusElement?.querySelector('.status-text');
  const localCamera = container.querySelector('#local-camera');
  const deviceSelector = container.querySelector('sw-device-selector');

  // Track combined mic+camera stream. sw-local-camera only needs the video
  // track, sw-audio-level only needs the audio track, but a single
  // MediaStream is easier to manage.
  let mediaStream = null;

  /**
   * Update both audio level components with current configuration
   */
  const updateAudioLevelComponents = () => {
    const bars = parseInt(barsSlider?.value || AUDIO_LEVEL_DEFAULTS.bars, 10);
    const maxSize = parseInt(maxSizeSlider?.value || AUDIO_LEVEL_DEFAULTS.maxSize, 10);

    if (audioLevelHorizontal) {
      audioLevelHorizontal.bars = bars;
      audioLevelHorizontal.maxSize = maxSize;
    }

    if (audioLevelVertical) {
      audioLevelVertical.bars = bars;
      audioLevelVertical.maxSize = maxSize;
    }
  };

  /**
   * Update status message
   * @param {string} message - Status message to display
   * @param {'normal' | 'active' | 'error'} type - Status type for styling
   */
  const updateStatus = (message, type = 'normal') => {
    if (statusElement && statusText) {
      statusElement.classList.remove('active', 'error');
      if (type !== 'normal') {
        statusElement.classList.add(type);
      }
      statusText.textContent = message;
    }
  };

  // Bars slider handler
  if (barsSlider && barsValue) {
    barsSlider.addEventListener('input', () => {
      barsValue.textContent = barsSlider.value;
      updateAudioLevelComponents();
    });
  }

  // Max size slider handler
  if (maxSizeSlider && maxSizeValue) {
    maxSizeSlider.addEventListener('input', () => {
      maxSizeValue.textContent = `${maxSizeSlider.value}px`;
      updateAudioLevelComponents();
    });
  }

  // Orientation toggle handlers
  if (orientationHorizontal && orientationVertical) {
    orientationHorizontal.addEventListener('click', () => {
      orientationHorizontal.classList.add('active');
      orientationHorizontal.setAttribute('aria-pressed', 'true');
      orientationVertical.classList.remove('active');
      orientationVertical.setAttribute('aria-pressed', 'false');

      // Note: The demo shows both orientations side by side,
      // so this toggle is for demonstration purposes
      if (audioLevelHorizontal) {
        audioLevelHorizontal.orientation = 'horizontal';
      }
    });

    orientationVertical.addEventListener('click', () => {
      orientationVertical.classList.add('active');
      orientationVertical.setAttribute('aria-pressed', 'true');
      orientationHorizontal.classList.remove('active');
      orientationHorizontal.setAttribute('aria-pressed', 'false');

      if (audioLevelHorizontal) {
        audioLevelHorizontal.orientation = 'vertical';
      }
    });
  }

  // Start/Stop microphone button handler
  if (startMicBtn) {
    startMicBtn.addEventListener('click', async () => {
      if (mediaStream) {
        stopMedia();
      } else {
        await startMedia();
      }
    });
  }

  // Swap tracks when the user picks a different camera or microphone
  if (deviceSelector) {
    deviceSelector.addEventListener('sw-device-change', async (e) => {
      if (!mediaStream) return;
      const { type, device } = e.detail || {};
      try {
        if (type === 'microphone') {
          await replaceTrack('audio', { deviceId: { exact: device.deviceId } });
        } else if (type === 'camera') {
          await replaceTrack('video', { deviceId: { exact: device.deviceId } });
        }
      } catch (err) {
        console.error('[DevicesView] Failed to swap track:', err);
      }
    });
  }

  /**
   * Replace a single track (audio or video) on the active stream.
   */
  async function replaceTrack(kind, constraints) {
    const tmp = await navigator.mediaDevices.getUserMedia({ [kind]: constraints });
    const newTrack = kind === 'audio' ? tmp.getAudioTracks()[0] : tmp.getVideoTracks()[0];
    const oldTracks = kind === 'audio'
      ? mediaStream.getAudioTracks()
      : mediaStream.getVideoTracks();
    oldTracks.forEach((t) => {
      t.stop();
      mediaStream.removeTrack(t);
    });
    mediaStream.addTrack(newTrack);

    // Re-assign to trigger reactive update on consumers
    if (kind === 'video' && localCamera) {
      localCamera.stream = new MediaStream(mediaStream.getTracks());
    }
    if (kind === 'audio') {
      if (audioLevelHorizontal) audioLevelHorizontal.stream = mediaStream;
      if (audioLevelVertical) audioLevelVertical.stream = mediaStream;
    }
  }

  /**
   * Start camera + microphone and wire them to the preview components
   */
  async function startMedia() {
    try {
      updateStatus('Requesting camera and microphone access...', 'normal');

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      if (audioLevelHorizontal) audioLevelHorizontal.stream = mediaStream;
      if (audioLevelVertical) audioLevelVertical.stream = mediaStream;
      if (localCamera) localCamera.stream = mediaStream;

      if (startMicBtn) {
        startMicBtn.textContent = 'Stop Camera & Microphone';
        startMicBtn.classList.add('active');
      }
      updateStatus('Camera and microphone active', 'active');

    } catch (error) {
      console.error('[DevicesView] Failed to access media devices:', error);

      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Access denied. Please allow camera and microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect devices and try again.';
      }

      updateStatus(errorMessage, 'error');
    }
  }

  /**
   * Stop all tracks and clear component streams
   */
  function stopMedia() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;

      if (audioLevelHorizontal) audioLevelHorizontal.stream = undefined;
      if (audioLevelVertical) audioLevelVertical.stream = undefined;
      if (localCamera) localCamera.stream = null;

      if (startMicBtn) {
        startMicBtn.textContent = 'Start Camera & Microphone';
        startMicBtn.classList.remove('active');
      }
      updateStatus('Click "Start Camera & Microphone" to enable the preview', 'normal');
    }
  }

  // Cleanup function when view is destroyed
  // This will be called automatically when the container is replaced
  const cleanup = () => {
    stopMedia();
  };

  // Store cleanup function on container for potential future use
  container._audioLevelCleanup = cleanup;
}
