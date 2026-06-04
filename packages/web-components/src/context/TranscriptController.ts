import type { ReactiveController, LitElement } from 'lit';
import { ContextProvider } from '@lit/context';
import type { Subscription } from 'rxjs';
import type { Call } from '../types/index.js';
import { getLogger } from '@signalwire/js';
import { transcriptContext } from './transcript-context.js';
import type { TranscriptEntry, TranscriptState } from './transcript-context.js';
import { ChatState } from './chat-state.js';
import type { ChatEntry } from './chat-state.js';

const logger = getLogger();

/**
 * AI signaling events the transcript FSM consumes. `user_event` is
 * intentionally excluded — it's owned by `UserEventController`.
 */
const AI_EVENT_TYPES = [
  'ai.partial_result',
  'ai.speech_detect',
  'ai.response_utterance',
  'ai.completion',
] as const;

type AiEventType = (typeof AI_EVENT_TYPES)[number];

/** Strip `{confidence=0.95}` markers the backend sometimes appends to ASR text. */
function stripConfidence(text: string): string {
  return text.replace(/\s*\{confidence=[\d.]+\}\s*/g, '').trim();
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Reactive controller that turns AI signaling events from a Call into
 * rendered transcript entries via `transcriptContext`.
 *
 * - `setCall(call)` binds/unbinds the FSM to a call's event streams.
 * - `injectEntry(entry)` appends an externally-sourced entry (e.g. a
 *   `display_content` system bubble pushed by `UserEventController`).
 */
export class TranscriptController implements ReactiveController {
  private _host: LitElement;
  private _provider: ContextProvider<typeof transcriptContext>;
  private _chat = new ChatState();
  private _injected: TranscriptEntry[] = [];
  private _subscriptions: Subscription[] = [];

  constructor(host: LitElement) {
    this._host = host;
    this._provider = new ContextProvider(host, {
      context: transcriptContext,
      initialValue: { entries: [] },
    });

    this._chat.onUpdate = () => this._publish();
    host.addController(this);
  }

  hostConnected(): void {}

  hostDisconnected(): void {
    this._teardownSubscriptions();
  }

  setCall(call: Call | undefined): void {
    this._teardownSubscriptions();
    this._chat.reset();
    this._injected = [];
    this._publish();

    if (!call) return;

    for (const eventType of AI_EVENT_TYPES) {
      const sub = call.subscribe(eventType).subscribe({
        next: (event) => {
          try {
            this._route(eventType, this._extractParams(event));
          } catch (err) {
            logger.warn(`[TranscriptController] handler for ${eventType} threw`, err);
          }
        },
        error: (err) => {
          logger.warn(`[TranscriptController] subscription error on ${eventType}`, err);
        },
      });
      this._subscriptions = [...this._subscriptions, sub];
    }
  }

  get state(): TranscriptState {
    return this._provider.value;
  }

  /** Append an externally-sourced entry (used by UserEventController for display_content). */
  injectEntry(entry: TranscriptEntry): void {
    this._injected = [...this._injected, entry];
    this._publish();
  }

  private _extractParams(event: Record<string, unknown>): Record<string, unknown> {
    const params = event['params'];
    if (params && typeof params === 'object') {
      return params as Record<string, unknown>;
    }
    return event;
  }

  private _route(eventType: AiEventType, params: Record<string, unknown>): void {
    switch (eventType) {
      case 'ai.partial_result':
        this._chat.onUserPartial(asString(params['text']));
        break;
      case 'ai.speech_detect': {
        const text = stripConfidence(asString(params['text']));
        this._chat.onUserComplete(text);
        break;
      }
      case 'ai.response_utterance': {
        const text = asString(params['utterance'] ?? params['text']);
        this._chat.onAiChunk(TranscriptController._stripVoiceDirectives(text));
        break;
      }
      case 'ai.completion': {
        const text = asString(params['text']);
        this._chat.onAiComplete(
          TranscriptController._stripVoiceDirectives(text),
          params['type'] === 'barged'
        );
        break;
      }
    }
  }

  private _teardownSubscriptions(): void {
    for (const sub of this._subscriptions) {
      try {
        sub.unsubscribe();
      } catch {
        /* noop */
      }
    }
    this._subscriptions = [];
  }

  private static _stripVoiceDirectives(text: string): string {
    // TTS directives look like ~LN(English (United States))-; and can appear either
    // at the start ("~LN(...)-; actual text") or in the middle when the server appends
    // the same text again for the TTS engine ("actual text ~LN(...)-; repeated text").
    const match = /\s*~[A-Z]+\(.*?\)-;\s*/i.exec(text);
    if (!match) return text.trim();
    const before = text.slice(0, match.index).trim();
    const after = text.slice(match.index + match[0].length).trim();
    return (before || after).trim();
  }

  private _toTranscriptEntry(entry: ChatEntry, index: number): TranscriptEntry {
    return {
      id: `chat-${index}-${entry.speaker}-${entry.state}`,
      type: entry.speaker === 'ai' ? 'agent' : 'user',
      state: entry.state,
      text: entry.text,
    };
  }

  private _publish(): void {
    const chatEntries = this._chat
      .getHistory()
      .map((e, i) => this._toTranscriptEntry(e, i));
    const entries = [...chatEntries, ...this._injected];
    this._provider.setValue({ entries });
    this._host.requestUpdate();
  }
}
