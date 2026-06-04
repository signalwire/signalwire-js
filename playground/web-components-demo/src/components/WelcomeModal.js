/**
 * Welcome Modal Component
 * Handles authentication flow with token or URL input
 */

import { StaticCredentialProvider, SignalWire } from '@signalwire/js';

let isRendered = false;

export function renderWelcomeModal(container, state) {
  // Don't show modal if authenticated
  if (state.isAuthenticated) {
    container.innerHTML = '';
    isRendered = false;
    return;
  }

  // Only re-render if needed
  if (isRendered) {
    updateModalState(container, state);
    return;
  }

  isRendered = true;

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="modal-backdrop" id="welcome-modal">
      <div class="modal-card">
        <div class="modal-logo">
          <svg width="180" height="40" viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="28" fill="#044EF5" font-family="system-ui" font-weight="600" font-size="24">SignalWire</text>
          </svg>
        </div>
        <h2 class="modal-title">WebRTC Demo</h2>

        <div class="auth-mode-toggle">
          <button type="button" class="mode-btn active" data-mode="token" aria-pressed="true">
            Enter Token
          </button>
          <button type="button" class="mode-btn" data-mode="url" aria-pressed="false">
            Fetch from URL
          </button>
        </div>

        <form id="auth-form" class="auth-form" novalidate>
          <div class="input-group">
            <label for="auth-input" class="sr-only" id="input-label">SAT Token</label>
            <input
              type="text"
              id="auth-input"
              class="input input-mono"
              placeholder="Enter your SAT token..."
              aria-labelledby="input-label"
              autocomplete="off"
            />
          </div>

          <div id="error-container" class="error-message" role="alert" aria-live="polite"></div>

          <button type="submit" class="btn btn-primary btn-full-width" id="submit-btn">
            <span id="submit-text">Connect</span>
            <span id="submit-spinner" class="spinner hidden"></span>
          </button>
        </form>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-card {
      background-color: var(--color-background);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: var(--space-xl);
      width: 100%;
      max-width: 400px;
      margin: var(--space-md);
    }

    .modal-logo {
      text-align: center;
      margin-bottom: var(--space-md);
    }

    .modal-title {
      text-align: center;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
    }

    .auth-mode-toggle {
      display: flex;
      gap: var(--space-xs);
      margin-bottom: var(--space-lg);
      background-color: var(--color-surface);
      border-radius: 8px;
      padding: var(--space-xs);
    }

    .mode-btn {
      flex: 1;
      padding: var(--space-sm) var(--space-md);
      border: none;
      border-radius: 6px;
      background-color: transparent;
      color: var(--color-text-secondary);
      font-size: var(--font-size-body);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .mode-btn:hover {
      color: var(--color-text-primary);
    }

    .mode-btn.active {
      background-color: var(--color-background);
      color: var(--color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    #submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      height: 44px;
    }

    .hidden {
      display: none !important;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Set up event handlers
  setupEventHandlers(container, state);
}

function updateModalState(container, state) {
  const errorContainer = container.querySelector('#error-container');
  const submitText = container.querySelector('#submit-text');
  const submitSpinner = container.querySelector('#submit-spinner');
  const submitBtn = container.querySelector('#submit-btn');
  const input = container.querySelector('#auth-input');
  const inputLabel = container.querySelector('#input-label');
  const modeButtons = container.querySelectorAll('.mode-btn');

  // Update mode buttons
  modeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === state.authMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });

  // Update input placeholder and label
  if (state.authMode === 'token') {
    input.placeholder = 'Enter your SAT token...';
    inputLabel.textContent = 'SAT Token';
  } else {
    input.placeholder = 'Enter token endpoint URL...';
    inputLabel.textContent = 'Token URL';
  }

  // Update error
  if (state.authError) {
    errorContainer.textContent = state.authError;
    input.classList.add('input-error');
  } else {
    errorContainer.textContent = '';
    input.classList.remove('input-error');
  }

  // Update loading state
  if (state.authLoading) {
    submitText.classList.add('hidden');
    submitSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
    input.disabled = true;
  } else {
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
    submitBtn.disabled = false;
    input.disabled = false;
  }
}

function setupEventHandlers(container, state) {
  const form = container.querySelector('#auth-form');
  const modeButtons = container.querySelectorAll('.mode-btn');
  const input = container.querySelector('#auth-input');

  // Mode toggle
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.authMode = btn.dataset.mode;
      state.authError = null;
      input.value = '';
    });
  });

  // Clear error on input
  input.addEventListener('input', () => {
    state.authError = null;
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const value = input.value.trim();
    if (!value) {
      state.authError = 'Please enter a value';
      return;
    }

    state.authLoading = true;
    state.authError = null;

    try {
      let token;

      if (state.authMode === 'url') {
        // Fetch token from URL
        const response = await fetch(value);
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.token) {
          throw new Error('Response does not contain a token field');
        }
        token = data.token;
      } else {
        token = value;
      }

      // Initialize SignalWire client with token credential
      // The SDK automatically fetches user info and connects to the signaling server
      // Note: constructor takes { token: string } as the credentials object
      const credentialsProvider = new StaticCredentialProvider({ token });
      const client = new SignalWire(credentialsProvider);

      // Wait for the client to complete its connection process
      // The SDK automatically calls connect() during initialization
      // We wait for the isConnected$ observable to emit true
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - could not connect to SignalWire'));
        }, 15000);

        const subscription = client.isConnected$.subscribe((isConnected) => {
          if (isConnected) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve();
          }
        });
      });

      // Set up reactive observers for connection and registration state
      // These observables allow the UI to react to real-time state changes
      client.isConnected$.subscribe((isConnected) => {
        state.isConnected = isConnected;
      });

      client.isRegistered$.subscribe((isRegistered) => {
        state.isRegistered = isRegistered;
      });

      // Get user info from the client's user object
      // The user is populated after successful connection
      if (client.user) {
        state.displayName = client.user.displayName || '';
        // Channels/scopes are available through appSettings
        const scopes = client.user.appSettings?.scopes || [];
        state.channels = {
          audio: true, // Default to true for demo
          video: true,
          messaging: scopes.includes('messaging') || false
        };
      }

      // Set up listener for incoming calls via the session
      // The session provides access to the incomingCalls$ observable
      client.session.incomingCalls$.subscribe((calls) => {
        // incomingCalls$ emits an array of incoming calls
        // We're interested in the first/newest incoming call
        if (calls && calls.length > 0) {
          state.inboundCall = calls[0];
        }
      });

      // Store client and mark as authenticated
      state.signalWire = client;
      state.authToken = token;
      state.isAuthenticated = true;
      state.authLoading = false;
    } catch (error) {
      console.error('Authentication error:', error);
      state.authError = error.message || 'Authentication failed';
      state.authLoading = false;
    }
  });
}
