import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SignalWire, getLogger } from '@signalwire/js';
import type { Call } from '../../types/index.js';
import { Subscription } from 'rxjs';
import { first, filter } from 'rxjs/operators';

import { CallStateContextController } from '../../context/CallStateContextController.js';
import { IncomingCallController } from '../../context/call-state-context.js';
import type { IncomingCallInfo } from '../../context/call-state-context.js';
import { DevicesContextController } from '../../context/DevicesContextController.js';
import { TranscriptController } from '../../context/TranscriptController.js';
import { UserEventController } from '../../context/UserEventController.js';

import '../sw-call-media.js';
import '../sw-local-camera.js';
import '../sw-call-controls.js';
import '../UI/layout/sw-ui-call-layout.js';
import '../UI/layout/sw-ui-responsive-container.js';
import '../UI/layout/sw-ui-modal.js';
import '../UI/layout/sw-ui-background.js';
import '../UI/layout/sw-ui-content-drawer.js';
import '../UI/sw-ui-transcript-view.js';
import { showPrompt } from '../UI/sw-ui-alert.js';
import type { DisplayContentPayload } from '../UI/layout/sw-ui-content-drawer.js';
import { ensureSignalWireTheme, ensureSignalWireFonts } from '../../utils/theme-loader.js';
import {
  parseUserVariablesAttribute,
  withWidgetCapabilities,
} from '../../utils/user-variables.js';
import { hostReset } from '../UI/host-reset.js';
import { buildCredentialProvider } from './client-factory.js';
import {
  widgetStyles,
  renderCallView,
  renderConnecting,
} from './sw-call-widget.templates.js';

const logger = getLogger();

/**
 * All-in-one call widget. Handles client initialisation, dialling, media,
 * controls and optional AI transcript — in either inline or modal modes.
 *
 * Composes `sw-ui-call-layout`, `sw-call-media`, `sw-local-camera`,
 * `sw-call-controls`, and `sw-ui-transcript-view` under the hood.
 * All child components are wired via Lit context — no manual plumbing needed.
 *
 * @prop {string}  token         - SignalWire SAT or embed token
 * @prop {string}  host          - Optional server host
 * @prop {string}  destination   - Call destination (address or resource)
 * @prop {boolean} modal         - Render in a `<sw-ui-modal>` overlay
 * @prop {boolean} transcription - Show AI transcript panel
 *
 * @slot background - Background element (e.g. `<sw-ui-background default>`)
 * @slot (default)  - Trigger element (click to dial, shown when idle)
 *
 * @fires sw-dial                  - When `dial()` is invoked. Detail: `{ destination }`.
 * @fires sw-call-ended            - When the call reaches a terminal state (user hangup, remote disconnect, or failure). Detail: `{ status }`.
 * @fires sw-display-content       - From `display_content` user event. Detail: `DisplayContentPayload`.
 * @fires signalwire-address:event - Forwarded SignalWire custom user events.
 *
 * All inner events bubble.
 *
 * @method dial()   - Initiate call
 * @method hangup() - End active call
 */
@customElement('sw-call-widget')
export class SwCallWidget extends LitElement {
  static styles = [hostReset, widgetStyles];

  // ── Public properties ──────────────────────────────────────────────

  @property({ type: String }) token = '';
  @property({ type: String }) host = '';
  @property({ type: String }) destination = '';
  @property({ type: Boolean, reflect: true }) modal = false;
  @property({ type: Boolean, reflect: true }) transcription = false;
  @property({ type: Boolean, reflect: true, attribute: 'allow-incoming-calls' }) allowIncomingCalls = false;
  @property({ type: Boolean, reflect: true, attribute: 'audio-only' }) audioOnly = false;

  /**
   * Custom variables sent with the Verto invite as a JSON object.
   *
   * The widget always advertises `capabilities.display_content` and
   * `metadata.widget.opened_at` so the agent can detect that the caller
   * supports the content drawer; user-supplied keys are merged in and win
   * on shallow conflict.
   *
   * Invalid JSON is logged and ignored — the call still dials.
   *
   * @example
   *   <sw-call-widget user-variables='{"customer_id": "abc-123"}'></sw-call-widget>
   */
  @property({ type: String, attribute: 'user-variables' }) userVariables = '';

  /**
   * Skip auto-injecting the SignalWire `theme.css` design-token stylesheet.
   * Set this when the host page already loads `@signalwire/web-components/theme.css`
   * or a custom theme written against the same DTCG token names.
   */
  @property({ type: Boolean, reflect: true, attribute: 'disable-auto-theme' }) disableAutoTheme = false;

  /**
   * Skip auto-loading the SignalWire brand fonts (Lexend, Instrument Sans,
   * JetBrains Mono) from Google Fonts. Set this when fonts are self-hosted
   * or loaded elsewhere.
   */
  @property({ type: Boolean, reflect: true, attribute: 'disable-auto-fonts' }) disableAutoFonts = false;

  // ── Internal state ─────────────────────────────────────────────────

  @state() private _call: Call | null = null;
  @state() private _connecting = false;
  @state() private _hasLayoutLayers = false;
  @state() private _drawer: DisplayContentPayload | null = null;

  // ── Context providers ──────────────────────────────────────────────

  private _callState = new CallStateContextController(this);
  private _devices = new DevicesContextController(this);
  private _transcript: TranscriptController = new TranscriptController(this);
  private _userEventCtrl = new UserEventController(this);
  private _incomingCalls = new IncomingCallController(this);

  // ── Internals ──────────────────────────────────────────────────────

  private _client: SignalWire | null = null;
  private _subs: Subscription[] = [];
  private _pendingIncoming = false;

  // ── Lifecycle ──────────────────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.disableAutoTheme) ensureSignalWireTheme();
    if (!this.disableAutoFonts) ensureSignalWireFonts();
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('token') || changed.has('host')) {
      if (this.token) {
        this._refreshClient();
      } else if (changed.has('host')) {
        // Host changed but no token configured yet — defer client init until
        // the consumer sets `.token`. Surface this so misconfigurations
        // (e.g. forgetting to bind token) don't fail silently.
        logger.debug(
          '[SwCallWidget] host changed but token is empty; skipping client refresh until token is set',
        );
      }
    } else if (changed.has('allowIncomingCalls') && this._client) {
      if (this.allowIncomingCalls) {
        this._connectIncomingCalls();
      } else {
        this._incomingCalls.disconnect();
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyClient();
  }

  // ── Client lifecycle ───────────────────────────────────────────────

  private _destroyClient(): void {
    this._subs.forEach((s) => s.unsubscribe());
    this._subs = [];

    this._incomingCalls.disconnect();
    this._devices.disconnectCall();
    this._devices.disconnect();
    this._callState.disconnect();
    this._transcript.setCall(undefined);


    if (this._client) {
      try {
        this._client.destroy();
      } catch (e) {
        logger.error('[SwCallWidget] Error destroying client:', e);
      }
      this._client = null;
    }

    this._call = null;
    this._connecting = false;
  }

  private _refreshClient(): void {
    this._destroyClient();
    try {
      this._client = new SignalWire(
        buildCredentialProvider(this.token, this.host),
      );
      this._devices.connectDevices(this._client as unknown as import('../../types/index.js').DeviceController);

      if (this.allowIncomingCalls) {
        this._connectIncomingCalls();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to initialise client';
      logger.error('[SwCallWidget] Failed to initialise client:', e);
      void showPrompt({ title: 'Client Error', description: message, type: 'alert' });
    }
  }

  // ── Public methods ─────────────────────────────────────────────────

  async dial(): Promise<void> {
    if (!this._client || this._connecting || this._call) return;
    if (!this.destination) {
      void showPrompt({ title: 'Call Error', description: 'No destination configured.', type: 'alert' });
      return;
    }

    this._connecting = true;

    this.dispatchEvent(new CustomEvent('sw-dial', {
      detail: { destination: this.destination },
      bubbles: true,
      composed: true,
    }));

    const wantsVideo = !this.audioOnly;

    try {
      const call = await new Promise<Call>((resolve, reject) => {
        const sub = this._client!.isConnected$
          .pipe(filter((c) => c), first())
          .subscribe({
            next: () => {
              const userVariables = withWidgetCapabilities(
                parseUserVariablesAttribute(this.userVariables)
              );
              this._client!
                .dial(this.destination, {
                  audio: true,
                  video: wantsVideo,
                  receiveAudio: true,
                  receiveVideo: wantsVideo,
                  userVariables,
                })
                .then(resolve)
                .catch(reject);
            },
            error: reject,
          });
        this._subs.push(sub);
      });

      this._wireCall(call);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to connect call';
      logger.error('[SwCallWidget] Dial failed:', e);
      void showPrompt({ title: 'Call Failed', description: message, type: 'alert' });
    } finally {
      this._connecting = false;
    }
  }

  async hangup(): Promise<void> {
    if (this._call) {
      await this._call.hangup();
    }
  }

  // ── Incoming calls ──────────────────────────────────────────────────

  private _connectIncomingCalls(): void {
    if (!this._client) return;
    this._incomingCalls.onIncomingCall = this._handleIncomingCall;
    this._subs.push(
      this._client.isConnected$
        .pipe(filter(Boolean), first())
        .subscribe(() => {
          if (this._client) {
            this._incomingCalls.connect(this._client.session.incomingCalls$);
          }
        })
    );
  }

  private _handleIncomingCall = async (info: IncomingCallInfo): Promise<void> => {
    if (this._call || this._connecting || this._pendingIncoming) return;
    this._pendingIncoming = true;

    try {
      const callerDisplay = info.callerName || info.callerNumber || 'Unknown Caller';
      // TODO(ringing-ux): the confirm dialog is a placeholder, not a real
      // ringing UI. Missing: caller avatar, audible ringtone, distinction
      // between "ignore" (let it keep ringing) and "reject" (decline now),
      // and a timeout. Replace with a dedicated `<sw-ui-incoming-call>`.
      const accepted = await showPrompt({
        title: 'Incoming Call',
        description: `${callerDisplay} is calling`,
        type: 'confirm',
      });

      if (accepted) {
        this._wireCall(info.call);
        info.call.answer();
      } else {
        info.call.reject();
      }
    } finally {
      this._pendingIncoming = false;
    }
  };

  // ── Call wiring ────────────────────────────────────────────────────

  private _wireCall(call: Call): void {
    this._call = call;

    // Wire contexts
    this._callState.connect(call);
    this._devices.connectCall(call);
    this._transcript.setCall(call);

    // Always subscribe to user_event for display_content and pass-through
    this._userEventCtrl.setCall(call);
    this.addEventListener('sw-display-content', this._onDisplayContent as EventListener);

    // Re-enumerate devices now that getUserMedia has granted permission
    this._devices.refreshDevices();

    // Track layout layers to know when MCU composites local camera
    this._subs.push(
      call.layoutLayers$.subscribe((layers) => {
        this._hasLayoutLayers = layers.length > 0;
      })
    );

    // Watch for call end
    this._subs.push(
      call.status$.subscribe((status) => {
        if (
          status === 'disconnected' ||
          status === 'destroyed' ||
          status === 'failed'
        ) {
          this._unwireCall();
        }
      })
    );
  }

  private _onDisplayContent = (e: CustomEvent<DisplayContentPayload>): void => {
    this._drawer = e.detail;
    this._transcript.injectEntry({
      id: crypto.randomUUID(),
      type: 'system',
      state: 'complete',
      text: e.detail.title ?? 'Agent shared content',
      meta: { displayContent: e.detail },
    });
  };

  private _onDrawerClose = (): void => {
    this._drawer = null;
  };

  private _unwireCall(): void {
    const endedCall = this._call;
    const endedStatus = endedCall?.status;

    this._callState.disconnect();
    this._devices.disconnectCall();
    this._transcript.setCall(undefined);
    this._userEventCtrl.setCall(undefined);
    this.removeEventListener('sw-display-content', this._onDisplayContent as EventListener);

    this._call = null;
    this._connecting = false;
    this._hasLayoutLayers = false;
    this._drawer = null;

    if (endedCall) {
      // Fires for any terminal transition — user hangup, remote disconnect,
      // or failure. Distinct from `sw-call-hangup` which only fires when the
      // user clicks the hangup button.
      this.dispatchEvent(new CustomEvent('sw-call-ended', {
        detail: { status: endedStatus },
        bubbles: true,
        composed: true,
      }));
    }
  }

  // ── Slot trigger ───────────────────────────────────────────────────

  private _onSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    slot.assignedElements({ flatten: true }).forEach((el) => {
      if (el instanceof HTMLElement) {
        el.addEventListener('click', () => this.dial());
      }
    });
  }

  // ── Event handlers ─────────────────────────────────────────────────

  private _onHangUp(): void {
    this.hangup();
  }

  private _onModalClose = (e: Event): void => {
    if (this._call || this._connecting) {
      // Active call → hang up. Modal will close automatically once the
      // call reaches a terminal state and `_unwireCall` clears `_call`.
      this.hangup();
      return;
    }
    if (!this.destination) {
      // Pre-call dialpad state — no destination entered yet. Keep the
      // modal open so the user doesn't lose their in-progress dialing.
      e.preventDefault();
    }
  };

  private _onFullscreenToggle(): void {
    const layout = this.shadowRoot?.querySelector('sw-ui-call-layout');
    if (layout) {
      (layout as import('../UI/layout/sw-ui-call-layout.js').SwUiCallLayout).toggleFullscreen();
    }
  }

  private _onTranscriptToggle(): void {
    this.transcription = !this.transcription;
  }

  // ── Render ─────────────────────────────────────────────────────────

  render() {
    const isActive = !!(this._call || this._connecting);
    const body = this._call
      ? renderCallView({
          transcription: this.transcription,
          hasLayoutLayers: this._hasLayoutLayers,
          drawer: this._drawer,
          transcriptEntries: this._transcript.state.entries,
          onHangUp: this._onHangUp,
          onFullscreenToggle: this._onFullscreenToggle,
          onTranscriptToggle: this._onTranscriptToggle,
          onDrawerClose: this._onDrawerClose,
        })
      : this._connecting
        ? renderConnecting()
        : nothing;

    if (this.modal) {
      return html`
        <slot @slotchange=${this._onSlotChange}></slot>
        <sw-ui-modal ?open=${isActive} @sw-modal-close=${this._onModalClose}>
          <sw-ui-responsive-container>
            ${body !== nothing ? body : nothing}
          </sw-ui-responsive-container>
        </sw-ui-modal>
      `;
    }

    if (body !== nothing) return body;

    return html`<slot @slotchange=${this._onSlotChange}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-widget': SwCallWidget;
  }
}
