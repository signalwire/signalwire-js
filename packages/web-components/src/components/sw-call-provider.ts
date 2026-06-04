import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Call, DeviceController } from '../types/index.js';
import { CallStateContextController } from '../context/CallStateContextController.js';
import { DevicesContextController } from '../context/DevicesContextController.js';

/**
 * Context provider element that bridges an external `Call` and/or
 * `DeviceController` into Lit context so any descendant web component
 * (sw-call-media, sw-call-controls, sw-participants, etc.) receives live
 * state without manual property wiring.
 *
 * Usage:
 *   ```html
 *   <sw-call-provider id="provider">
 *     <sw-call-media></sw-call-media>
 *     <sw-call-controls></sw-call-controls>
 *   </sw-call-provider>
 *   ```
 *   ```js
 *   provider.call = activeCall;
 *   provider.deviceController = signalWireClient;
 *   ```
 *
 * @prop {Call}             call             - Active call object
 * @prop {DeviceController} deviceController - Device controller for input/output device management
 *
 * @slot - Default slot. Descendants consume the provided contexts.
 */
@customElement('sw-call-provider')
export class SwCallProvider extends LitElement {
  static styles = css`:host { display: contents; }`;

  @property({ attribute: false }) call: Call | undefined = undefined;
  @property({ attribute: false }) deviceController: DeviceController | undefined = undefined;

  private _callState = new CallStateContextController(this);
  private _devices = new DevicesContextController(this);

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (changed.has('call')) {
      if (this.call) {
        this._callState.connect(this.call);
        this._devices.connectCall(this.call);
      } else {
        this._callState.disconnect();
        this._devices.disconnectCall();
      }
    }

    if (changed.has('deviceController') && this.deviceController) {
      this._devices.connectDevices(this.deviceController);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._callState.disconnect();
    this._devices.disconnect();
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-provider': SwCallProvider;
  }
}
