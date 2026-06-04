/**
 * Shared setup utilities for examples.
 *
 * This file handles the boring parts so examples can focus on one concept:
 * - Token input UI
 * - Client connection
 * - Basic error display
 *
 * Examples import this and call setupClient() to get a connected client.
 */

// Wait for SDK to load
function waitForSDK() {
  return new Promise((resolve) => {
    if (window.SignalWire?.ready) {
      resolve(window.SignalWire);
    } else {
      window.addEventListener('signalwire:js:ready', () => {
        resolve(window.SignalWire);
      });
    }
  });
}

/**
 * Creates and connects a SignalWire.
 * Shows a token input form if no token is cached.
 *
 * @returns {Promise<{client: SignalWire, SW: SignalWire}>}
 */
export async function setupClient() {
  const SW = await waitForSDK();

  // Check for cached token
  let token = localStorage.getItem('sw_example_token');

  if (!token) {
    token = await promptForToken();
  }

  const credentials = new SW.StaticCredentialProvider({ token });
  const client = new SW.SignalWire(credentials);

  // Show connection status
  const status = document.getElementById('connection-status');
  if (status) {
    client.isConnected$.subscribe((connected) => {
      status.textContent = connected ? 'Connected' : 'Disconnected';
      status.className = connected ? 'status connected' : 'status disconnected';
    });
  }

  // Show errors
  client.errors$.subscribe((error) => {
    console.error('Client error:', error);
    showError(error.message);

    if (error.name === 'InvalidCredentialsError') {
      localStorage.removeItem('sw_example_token');
      location.reload();
    }
  });

  // Wait for ready
  await new Promise((resolve) => {
    client.ready$.subscribe((ready) => {
      if (ready) resolve();
    });
  });

  return { client, SW };
}

/**
 * Shows a simple token input prompt.
 */
function promptForToken() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999">
        <div style="background:#1a1a2e;padding:2rem;border-radius:12px;max-width:400px;width:90%">
          <h2 style="color:#fff;margin:0 0 1rem">Enter SAT Token</h2>
          <input type="text" id="token-input" placeholder="Your Subscriber Access Token"
            style="width:100%;padding:0.75rem;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#fff;font-size:1rem;margin-bottom:1rem">
          <button id="token-submit"
            style="width:100%;padding:0.75rem;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer">
            Connect
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('token-input');
    const submit = document.getElementById('token-submit');

    // Try to load from localStorage
    input.value = localStorage.getItem('sw_example_token') || '';

    const handleSubmit = () => {
      const token = input.value.trim();
      if (token) {
        localStorage.setItem('sw_example_token', token);
        overlay.remove();
        resolve(token);
      }
    };

    submit.onclick = handleSubmit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') handleSubmit();
    };
    input.focus();
  });
}

/**
 * Displays an error message to the user.
 */
export function showError(message) {
  let container = document.getElementById('error-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'error-container';
    container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999';
    document.body.appendChild(container);
  }

  const error = document.createElement('div');
  error.style.cssText =
    'background:#991b1b;color:#fff;padding:1rem;border-radius:8px;margin-bottom:0.5rem;max-width:300px';
  error.textContent = message;
  container.appendChild(error);

  setTimeout(() => error.remove(), 5000);
}

/**
 * Attaches a MediaStream to a video element.
 */
export function attachStream(elementId, stream) {
  const video = document.getElementById(elementId);
  if (video && stream) {
    video.srcObject = stream;
  }
}

/**
 * Clears the cached token (for logout).
 */
export function clearToken() {
  localStorage.removeItem('sw_example_token');
}
