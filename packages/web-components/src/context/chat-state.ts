/**
 * ChatState — AI transcript FSM.
 *
 * Accumulates signaling events into a renderable chat history. The key
 * property is that an AI partial and a user partial can coexist (e.g. when
 * the user barges mid-response), and both are rendered — ordered by which
 * party spoke most recently.
 *
 * Event semantics:
 *   - `ai.response_utterance` → AI chunk; buffer into `_aiPartial`.
 *   - `ai.completion`         → AI finished. Promote partial to complete.
 *                                If `barged`, `lastSpoken` flips to user.
 *   - `ai.partial_result`     → User partial; replace `_userPartial`.
 *   - `ai.speech_detect`      → User finished. Promote partial (or insert
 *                                directly) with the server's final text.
 */
export type Speaker = 'ai' | 'user';
export type EntryState = 'partial' | 'complete';

export interface ChatEntry {
  speaker: Speaker;
  text: string;
  state: EntryState;
}

export class ChatState {
  private _entries: ChatEntry[] = [];
  private _aiPartial: ChatEntry | null = null;
  private _userPartial: ChatEntry | null = null;
  private _lastSpoken: Speaker | null = null;

  /** Invoked after any state change. Overridable by consumers. */
  public onUpdate: () => void = () => {};

  /** Completed entries plus any live partials, in render order. */
  public getHistory(): ChatEntry[] {
    const out = [...this._entries];
    if (this._aiPartial && this._userPartial) {
      if (this._lastSpoken === 'user') {
        out.push(this._aiPartial, this._userPartial);
      } else {
        out.push(this._userPartial, this._aiPartial);
      }
    } else if (this._aiPartial) {
      out.push(this._aiPartial);
    } else if (this._userPartial) {
      out.push(this._userPartial);
    }
    return out;
  }

  public get hasAny(): boolean {
    return (
      this._entries.length > 0 ||
      this._aiPartial !== null ||
      this._userPartial !== null
    );
  }

  public get lastSpoken(): Speaker | null {
    return this._lastSpoken;
  }

  public reset(): void {
    this._entries = [];
    this._aiPartial = null;
    this._userPartial = null;
    this._lastSpoken = null;
    this.onUpdate();
  }

  public onUserPartial(text: string): void {
    if (!text) return;
    this._userPartial = { speaker: 'user', text, state: 'partial' };
    this._lastSpoken = 'user';
    this.onUpdate();
  }

  public onUserComplete(text: string): void {
    if (!text) {
      // No final text — drop any lingering partial silently.
      this._userPartial = null;
      this.onUpdate();
      return;
    }
    this._entries = [
      ...this._entries,
      { speaker: 'user', text, state: 'complete' },
    ];
    this._userPartial = null;
    this._lastSpoken = 'user';
    this.onUpdate();
  }

  public onAiChunk(text: string): void {
    if (!text) return;
    if (!this._aiPartial) {
      this._aiPartial = { speaker: 'ai', text, state: 'partial' };
    } else {
      const merged = `${this._aiPartial.text} ${text}`
        .replace(/\s+/g, ' ')
        .trim();
      this._aiPartial = { ...this._aiPartial, text: merged };
    }
    this._lastSpoken = 'ai';
    this.onUpdate();
  }

  public onAiComplete(text: string, barged: boolean): void {
    if (this._aiPartial) {
      const finalText = text.length > 0 ? text : this._aiPartial.text;
      this._entries = [
        ...this._entries,
        { speaker: 'ai', text: finalText, state: 'complete' },
      ];
      this._aiPartial = null;
    } else if (text.length > 0) {
      this._entries = [
        ...this._entries,
        { speaker: 'ai', text, state: 'complete' },
      ];
    }
    this._lastSpoken = barged ? 'user' : 'ai';
    this.onUpdate();
  }
}
