import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { highlight } from '../../utils/prism.js';
import { transcriptToMarkdown } from '../../utils/transcriptToMarkdown.js';
import { hostReset } from './host-reset.js';

/**
 * A single transcript entry rendered as a chat bubble.
 *
 * The optional `meta` field carries rich content from the AI.
 */
export interface TranscriptEntry {
  id: string;
  type: 'user' | 'agent' | 'system';
  state: 'partial' | 'complete';
  text: string;
  meta?: TranscriptEntryMeta;
}

/** Rich content attached to a transcript entry. */
export interface TranscriptEntryMeta {
  /** Clickable links. */
  links?: { label: string; url: string }[];
  /** Code snippet. */
  code?: { language?: string; content: string };
  /**
   * Content that the agent pushed via a `display_content` user_event.
   * Stored here so the download serializer can include the full payload.
   */
  displayContent?: {
    title?: string;
    content: string;
    format: 'text' | 'markdown' | 'code' | 'html';
    language?: string;
  };
}

@customElement('sw-ui-transcript-view')
export class SwUiTranscriptView extends LitElement {
  static styles = [hostReset, css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-page);
        color: var(--fg-default);
        font-family: var(--type-family-body);
        font-size: var(--type-size-small);
        overflow: hidden;
      }

      .header {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px 8px 14px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--fg-default) 40%, transparent);
        border-bottom: 1px solid var(--border-default);
        user-select: none;
      }

      .download-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 5px;
        cursor: pointer;
        color: color-mix(in srgb, var(--fg-default) 50%, transparent);
        transition:
          background var(--transition-fast),
          color var(--transition-fast);
      }

      .download-btn:hover {
        background: var(--bg-surface-raised);
        color: var(--fg-default);
      }


      .messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 10px 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        scroll-behavior: smooth;
      }

      .messages::-webkit-scrollbar {
        width: 4px;
      }
      .messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .messages::-webkit-scrollbar-thumb {
        background: var(--bg-surface-raised);
        border-radius: 2px;
      }

      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.25);
        padding: 20px;
        text-align: center;
      }

      .bubble {
        max-width: 85%;
        padding: 8px 12px;
        border-radius: 14px;
        font-size: 0.8125rem;
        line-height: 1.45;
        word-break: break-word;
        animation: pop-in 0.15s ease-out;
      }

      @keyframes pop-in {
        from {
          opacity: 0;
          transform: scale(0.94) translateY(4px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .user {
        align-self: flex-end;
        background: var(--interactive-button-primary-bg);
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .agent {
        align-self: flex-start;
        background: var(--bg-surface);
        color: var(--fg-default);
        border-bottom-left-radius: 4px;
      }
      .system {
        align-self: center;
        background: transparent;
        border: 1px solid var(--border-default);
        color: var(--fg-default);
        font-size: 0.75rem;
        max-width: 95%;
      }

      .partial {
        opacity: 0.55;
      }

      /* ── Links ── */
      .meta-links {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      }

      .meta-links a {
        color: var(--interactive-button-primary-bg);
        text-decoration: none;
        font-size: 0.75rem;
        padding: 2px 8px;
        border: 1px solid var(--interactive-button-primary-bg);
        border-radius: 4px;
        transition: background var(--transition-fast);
      }

      .meta-links a:hover {
        background: var(--interactive-button-primary-bg);
        color: #fff;
      }

      /* ── Code block ── */
      .meta-code {
        margin-top: 8px;
        border-radius: 6px;
        overflow: hidden;
      }

      .meta-code pre {
        margin: 0;
        padding: 10px 12px;
        background: #1a1b26;
        overflow-x: auto;
        font-size: 0.72rem;
        line-height: 1.5;
      }

      .meta-code code {
        font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
        color: #f8f8f2;
      }

      /* ── Prism Okaidia theme ── */
      .token.comment,
      .token.prolog,
      .token.doctype,
      .token.cdata {
        color: #8292a2;
      }
      .token.punctuation {
        color: #f8f8f2;
      }
      .token.namespace {
        opacity: 0.7;
      }
      .token.property,
      .token.tag,
      .token.constant,
      .token.symbol,
      .token.deleted {
        color: #f92672;
      }
      .token.boolean,
      .token.number {
        color: #ae81ff;
      }
      .token.selector,
      .token.attr-name,
      .token.string,
      .token.char,
      .token.builtin,
      .token.inserted {
        color: #a6e22e;
      }
      .token.operator,
      .token.entity,
      .token.url,
      .token.variable {
        color: #f8f8f2;
      }
      .token.atrule,
      .token.attr-value,
      .token.function,
      .token.class-name {
        color: #e6db74;
      }
      .token.keyword {
        color: #66d9ef;
      }
      .token.regex,
      .token.important {
        color: #fd971f;
      }
      .token.important,
      .token.bold {
        font-weight: bold;
      }
      .token.italic {
        font-style: italic;
      }
    `];

  @property({ attribute: false }) entries: TranscriptEntry[] = [];
  @property({ type: String }) header = 'Transcript';
  @property({ type: String, attribute: 'empty-text' }) emptyText = '';

  // entry.id → highlighted HTML (populated asynchronously)
  @state() private _codeCache = new Map<string, string>();

  private _lastEntryCount = 0;

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (this.entries.length !== this._lastEntryCount) {
      this._lastEntryCount = this.entries.length;
      this._autoScroll();
    }
    if (changed.has('entries')) {
      void this._highlightNewEntries();
    }
  }

  private async _highlightNewEntries(): Promise<void> {
    const toHighlight = this.entries.filter((e) => e.meta?.code && !this._codeCache.has(e.id));
    if (toHighlight.length === 0) return;

    await Promise.all(
      toHighlight.map(async (e) => {
        const { content, language = '' } = e.meta!.code!;
        const html = await highlight(content, language);
        this._codeCache = new Map(this._codeCache).set(e.id, html);
      })
    );

    // The highlighted re-render extends the scroll height — scroll again
    // now that the final DOM height is known.
    await this.updateComplete;
    this._autoScroll();
  }

  private _downloadTranscript(): void {
    const md = transcriptToMarkdown(this.entries);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private _autoScroll(): void {
    const el = this.shadowRoot?.querySelector('.messages');
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  private _renderCode(entry: TranscriptEntry) {
    const code = entry.meta?.code;
    if (!code) return nothing;
    const cached = this._codeCache.get(entry.id);
    return html`
      <div class="meta-code" part="code">
        <pre><code>${cached ? unsafeHTML(cached) : code.content}</code></pre>
      </div>
    `;
  }

  render() {
    const hasEntries = this.entries.some((e) => e.state === 'complete');

    return html`
      <div class="header" part="header">
        <span>${this.header}</span>
        <button
          class="download-btn"
          part="download-btn"
          title="Download transcript as Markdown"
          ?disabled=${!hasEntries}
          @click=${this._downloadTranscript}
        >
          <sw-ui-icon name="download" size="15"></sw-ui-icon>
        </button>
      </div>

      ${this.entries.length === 0
        ? html`<div class="empty" part="empty">${this.emptyText}</div>`
        : html`
            <div class="messages" part="messages">
              ${this.entries.map(
                (e) => html`
                  <div
                    class="bubble ${e.type} ${e.state === 'partial' ? 'partial' : ''}"
                    part="bubble bubble-${e.type}"
                  >
                    ${e.text}
                    ${e.meta?.links?.length
                      ? html`<div class="meta-links">
                          ${e.meta.links.map(
                            (l) =>
                              html`<a href=${l.url} target="_blank" rel="noopener">${l.label}</a>`
                          )}
                        </div>`
                      : nothing}
                    ${this._renderCode(e)}
                  </div>
                `
              )}
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-transcript-view': SwUiTranscriptView;
  }
}
