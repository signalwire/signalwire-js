import type { ReactiveController, LitElement } from 'lit';
import type { Subscription } from 'rxjs';
import { getLogger } from '@signalwire/js';
import type { Call } from '../types/index.js';
import type { DisplayContentPayload } from '../components/UI/layout/sw-ui-content-drawer.js';

const logger = getLogger();
const USER_EVENT_TYPE = 'user_event';
const ALLOWED_FORMATS = ['text', 'markdown', 'code', 'html'] as const;
type AllowedFormat = (typeof ALLOWED_FORMATS)[number];

function asFormat(v: unknown): AllowedFormat {
  return (ALLOWED_FORMATS as readonly string[]).includes(v as string)
    ? (v as AllowedFormat)
    : 'text';
}

/**
 * Raw shape of the params object inside a `user_event` signaling event.
 * The `type` field routes to either the content drawer or the pass-through.
 */
interface UserEventParams extends Record<string, unknown> {
  type?: string;
}

/**
 * Reactive controller that subscribes to `user_event` on a Call and routes
 * each event by its `type` field:
 *
 * - `display_content` → dispatches `sw-display-content` on the host so the
 *   call-widget can open the content drawer.
 *
 * - everything else   → dispatches `signalwire-address:event` on the host
 *   so the embedding page can handle custom agent events.
 *
 * Always active once `setCall()` is called — no opt-in required.
 */
export class UserEventController implements ReactiveController {
  private _host: LitElement;
  private _subscription?: Subscription;

  constructor(host: LitElement) {
    this._host = host;
    host.addController(this);
  }

  hostConnected(): void {}

  hostDisconnected(): void {
    this._subscription?.unsubscribe();
    this._subscription = undefined;
  }

  setCall(call: Call | undefined): void {
    this._subscription?.unsubscribe();
    this._subscription = undefined;

    if (!call) return;

    this._subscription = call.subscribe(USER_EVENT_TYPE).subscribe((event) => {
      logger.debug('[UserEventController] user_event arrived', event);
      const params = event['params'] as UserEventParams | undefined;
      if (!params) return;
      this._route(params);
    });
  }

  private _route(params: UserEventParams): void {
    if (params.type === 'display_content') {
      this._handleDisplayContent(params);
    } else {
      this._handlePassThrough(params);
    }
  }

  private _handleDisplayContent(params: UserEventParams): void {
    const payload: DisplayContentPayload = {
      content: (params['content'] as string | undefined) ?? '',
      format: asFormat(params['format']),
      title: params['title'] as string | undefined,
      language: params['language'] as string | undefined,
    };

    this._host.dispatchEvent(
      new CustomEvent<DisplayContentPayload>('sw-display-content', {
        detail: payload,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePassThrough(params: UserEventParams): void {
    this._host.dispatchEvent(
      new CustomEvent('signalwire-address:event', {
        detail: params,
        bubbles: true,
        composed: true,
      })
    );
  }
}
