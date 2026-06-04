/**
 * Inbound Call Modal Component
 * Shows incoming call notification with accept/reject options
 */

export function renderInboundCallModal(container, state) {
  const call = state.inboundCall;

  // Don't show if no inbound call
  if (!call) {
    container.innerHTML = '';
    return;
  }

  // Get caller info
  const callerName = call.callerName || 'Unknown Caller';
  const callerNumber = call.callerNumber || '';

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="inbound-modal-backdrop" id="inbound-call-modal">
      <div class="inbound-modal-card pulse">
        <div class="inbound-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
        </div>

        <div class="caller-info">
          <span class="call-direction">Incoming Call</span>
          <h2 class="caller-name">${escapeHtml(callerName)}</h2>
          ${callerNumber ? `<span class="caller-number">${escapeHtml(callerNumber)}</span>` : ''}
        </div>

        <div class="inbound-actions">
          <button class="btn btn-danger inbound-btn" id="reject-btn" aria-label="Reject call">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
            <span>Reject</span>
          </button>

          <button class="btn btn-success inbound-btn" id="accept-btn" aria-label="Accept call">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .inbound-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .inbound-modal-card {
      background-color: var(--color-background);
      border-radius: 16px;
      padding: var(--space-xl);
      text-align: center;
      max-width: 360px;
      width: 100%;
      margin: var(--space-md);
    }

    .inbound-modal-card.pulse {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(4, 78, 245, 0.4);
      }
      50% {
        box-shadow: 0 0 0 20px rgba(4, 78, 245, 0);
      }
    }

    .inbound-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-md);
      background-color: var(--color-success);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .inbound-icon svg {
      width: 32px;
      height: 32px;
    }

    .caller-info {
      margin-bottom: var(--space-xl);
    }

    .call-direction {
      display: block;
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xs);
    }

    .caller-name {
      font-size: var(--font-size-h1);
      margin-bottom: var(--space-xs);
    }

    .caller-number {
      font-size: var(--font-size-body);
      color: var(--color-text-secondary);
    }

    .inbound-actions {
      display: flex;
      gap: var(--space-md);
    }

    .inbound-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      border-radius: 12px;
    }

    .inbound-btn svg {
      width: 28px;
      height: 28px;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Set up event handlers
  const acceptBtn = container.querySelector('#accept-btn');
  const rejectBtn = container.querySelector('#reject-btn');

  acceptBtn.addEventListener('click', async () => {
    try {
      // If already on a call, hang it up first
      if (state.activeCall) {
        await state.activeCall.hangup();
      }

      // Accept the inbound call
      await call.answer();
      state.activeCall = call;
      state.inboundCall = null;

      // Subscribe to call end
      const sub = call.status$.subscribe(status => {
        if (status === 'destroyed' || status === 'failed') {
          state.activeCall = null;
          sub.unsubscribe();
          errorSub.unsubscribe();
        }
      });

      // Subscribe to call errors — fatal errors auto-destroy the call
      const errorSub = call.errors$.subscribe(callError => {
        console.error(`[InboundCallModal] Call error [${callError.kind}]:`, callError.error);
      });
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  });

  rejectBtn.addEventListener('click', async () => {
    try {
      await call.reject();
      state.inboundCall = null;
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  });

  // Auto-dismiss if call is cancelled
  const autoDismissSub = call.status$.subscribe(status => {
    if (status === 'destroyed' || status === 'failed') {
      state.inboundCall = null;
      autoDismissSub.unsubscribe();
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
