/**
 * Directory View Component
 * Shows sw-directory for contact-based calling
 */

export function renderDirectoryView(container, state) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="directory-view">
      <h1>Directory</h1>
      <p class="view-description">Browse and call contacts from your directory.</p>

      <div class="directory-container">
        <sw-directory></sw-directory>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .directory-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .directory-view h1 {
      margin-bottom: var(--space-sm);
    }

    .view-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
    }

    .directory-container {
      flex: 1;
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-lg);
      overflow: auto;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Connect directory to SignalWire client
  const directory = container.querySelector('sw-directory');
  if (directory && state.signalWire) {
    directory.directory = state.signalWire.directory;

    // Handle call initiation from directory
    // The sw-directory component dispatches 'sw-dial' when the call button is clicked
    directory.addEventListener('sw-dial', (event) => {
      const { address } = event.detail;
      // Use the address's default channel (video for rooms, audio for others)
      const channel = address.defaultChannel;
      if (!channel) {
        console.error(`No callable channel found for ${address.displayName}`);
        return;
      }
      // Use video for room-type addresses, audio-only for others
      initiateCall(state, channel, address.type === 'room');
    });
  }
}

async function initiateCall(state, destination, useVideo = true) {
  if (!state.signalWire || !state.isRegistered) {
    console.error('Cannot initiate call: not registered');
    return;
  }

  try {
    // dial() takes destination as first param, options as second
    const call = await state.signalWire.dial(destination, {
      audio: true,
      video: useVideo
    });

    state.activeCall = call;

    // Subscribe to call end
    const statusSub = call.status$.subscribe(status => {
      if (status === 'disconnected' || status === 'failed' || status === 'destroyed') {
        state.activeCall = null;
        statusSub.unsubscribe();
        errorSub.unsubscribe();
      }
    });

    // Subscribe to call errors — fatal errors auto-destroy the call
    const errorSub = call.errors$.subscribe(callError => {
      console.error(`[DirectoryView] Call error [${callError.kind}]:`, callError.error);
    });
  } catch (error) {
    console.error('Failed to initiate call:', error);
  }
}
