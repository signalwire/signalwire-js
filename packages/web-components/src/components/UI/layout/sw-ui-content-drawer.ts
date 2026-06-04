import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../icons/sw-ui-icon.js';
import { getLogger } from '@signalwire/js';
import { highlight } from '../../../utils/prism.js';

const logger = getLogger();

/** Formats supported by the content drawer. */
export type ContentFormat = 'text' | 'markdown' | 'code' | 'html';

/** Payload that drives the content drawer. */
export interface DisplayContentPayload {
  title?: string;
  content: string;
  format: ContentFormat;
  /** Prism language name (required when format === 'code'). */
  language?: string;
}

// ── DOMPurify allowlist ──────────────────────────────────────────────────────

// DOMPurify already blocks all `on*` event handlers by default — we only need
// to extend the defaults for things it would otherwise allow (inline `style`).
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code', 'blockquote', 'hr', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'img', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'title'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['style'],
};

// Force `rel="noopener noreferrer"` on any anchor that opens in a new context.
// Without this, sanitized markdown/html with `<a target="_blank">` could let
// the opened page reach back into ours via `window.opener`.
type DOMPurifyNS = typeof import('dompurify')['default'];
let purifyHookInstalled = false;
function ensurePurifyHook(DOMPurify: DOMPurifyNS): DOMPurifyNS {
  if (purifyHookInstalled) return DOMPurify;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  purifyHookInstalled = true;
  return DOMPurify;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Content drawer overlay for the call widget.
 *
 * Slides in from the right on wide containers; on narrow containers (parent
 * width ≤ 480 px) it slides up from the bottom instead.
 *
 * Formats: `text` · `markdown` (marked + DOMPurify) · `code` (Prism) · `html` (DOMPurify)
 *
 * @fires sw-content-drawer-close - User clicked the close button. No detail.
 */
@customElement('sw-ui-content-drawer')
export class SwUiContentDrawer extends LitElement {
  static styles = css`
    /* ── Host — default: slide in from the right ── */
    :host {
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      width: min(360px, 100%);
      height: 100%;
      z-index: 20;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    :host([open]) {
      transform: translateX(0);
      pointer-events: auto;
    }

    /* ── Narrow mode: slide up from the bottom ── */
    :host([narrow]) {
      width: 100%;
      height: auto;
      max-height: 65%;
      top: auto;
      bottom: 0;
      transform: translateY(100%);
    }

    :host([narrow][open]) {
      transform: translateY(0);
    }

    /* ── Panel ── */
    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-page);
      border-left: 1px solid var(--border-default);
      overflow: hidden;
    }

    :host([narrow]) .panel {
      border-left: none;
      border-top: 1px solid var(--border-default);
      border-radius: var(--sw-call-layout-radius, 0) var(--sw-call-layout-radius, 0) 0 0;
    }

    /* ── Header ── */
    .header {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-default);
      min-height: 42px;
    }

    .title {
      flex: 1;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--fg-default) 50%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lang-badge {
      font-size: 10px;
      font-weight: 500;
      color: var(--fg-muted);
      background: var(--bg-surface);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-default);
      flex-shrink: 0;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: color-mix(in srgb, var(--fg-default) 55%, transparent);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      flex-shrink: 0;
    }

    .action-btn:hover {
      background: var(--bg-surface-raised);
      color: var(--fg-default);
    }

    .copy-done {
      color: var(--interactive-status-success) !important;
    }

    /* ── Body ── */
    .body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 14px 14px 20px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--fg-default);
    }

    .body::-webkit-scrollbar { width: 4px; }
    .body::-webkit-scrollbar-track { background: transparent; }
    .body::-webkit-scrollbar-thumb {
      background: var(--bg-surface-raised);
      border-radius: 2px;
    }

    /* ── text format ── */
    .content-text {
      white-space: pre-wrap;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    /* ── code format ── */
    .content-code pre {
      margin: 0;
      padding: 14px 16px;
      background: #1a1b26;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12.5px;
      line-height: 1.6;
    }

    .content-code code {
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
      color: #f8f8f2;
    }

    /* ── markdown / html format ── */
    .content-rich { overflow-wrap: break-word; }

    .content-rich h1, .content-rich h2, .content-rich h3 {
      margin: 0 0 8px; font-weight: 600; color: var(--fg-default);
    }
    .content-rich h1 { font-size: 1.2em; }
    .content-rich h2 { font-size: 1.1em; }
    .content-rich h3 { font-size: 1em; }

    .content-rich p { margin: 0 0 10px; }
    .content-rich p:last-child { margin-bottom: 0; }

    .content-rich ul, .content-rich ol { margin: 0 0 10px; padding-left: 18px; }
    .content-rich li { margin-bottom: 4px; }

    .content-rich code {
      font-family: ui-monospace, monospace;
      font-size: 0.85em;
      background: rgba(255,255,255,0.1);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .content-rich pre {
      background: #1a1b26;
      border-radius: 6px;
      padding: 10px 12px;
      overflow-x: auto;
      margin: 0 0 10px;
    }

    .content-rich pre code { background: transparent; padding: 0; color: #f8f8f2; }

    .content-rich a { color: var(--interactive-button-primary-bg); text-decoration: underline; }
    .content-rich a:hover { opacity: 0.85; }

    .content-rich blockquote {
      border-left: 3px solid var(--border-default);
      margin: 0 0 10px;
      padding-left: 10px;
      color: var(--fg-muted);
    }

    .content-rich table {
      border-collapse: collapse; width: 100%; margin: 0 0 10px; font-size: 0.85em;
    }
    .content-rich th, .content-rich td {
      border: 1px solid var(--border-default); padding: 4px 8px; text-align: left;
    }
    .content-rich th { background: var(--bg-surface); font-weight: 600; }

    /* ── Prism Okaidia theme (must live in shadow DOM) ── */
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata                { color: #8292a2; }
    .token.punctuation          { color: #f8f8f2; }
    .token.namespace            { opacity: 0.7; }
    .token.property,
    .token.tag,
    .token.constant,
    .token.symbol,
    .token.deleted              { color: #f92672; }
    .token.boolean,
    .token.number               { color: #ae81ff; }
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.inserted             { color: #a6e22e; }
    .token.operator,
    .token.entity,
    .token.url,
    .token.variable             { color: #f8f8f2; }
    .token.atrule,
    .token.attr-value,
    .token.function,
    .token.class-name           { color: #e6db74; }
    .token.keyword              { color: #66d9ef; }
    .token.regex,
    .token.important            { color: #fd971f; }
    .token.important,
    .token.bold                 { font-weight: bold; }
    .token.italic               { font-style: italic; }
  `;

  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: String }) title = '';
  @property({ type: String }) content = '';
  @property({ type: String }) format: ContentFormat = 'text';
  @property({ type: String }) language = '';

  @state() private _renderedHtml = '';
  @state() private _renderFormat: ContentFormat = 'text';
  @state() private _copied = false;

  // Incremented each time a new render is requested; stale renders check this.
  private _renderId = 0;

  private _ro?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    this._ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) this.narrow = entry.contentRect.width <= 480;
    });
    // Observe the parent element (the positioning container) so narrow mode
    // triggers on the container's width, not the drawer's own width.
    const parent = this.parentElement;
    if (parent) this._ro.observe(parent);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._ro = undefined;
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('content') || changed.has('format') || changed.has('language')) {
      void this._renderContent();
    }
  }

  private async _renderContent(): Promise<void> {
    const id = ++this._renderId;
    const { content, format, language } = this;

    if (format === 'text') {
      if (id !== this._renderId) return;
      this._renderedHtml = '';
      this._renderFormat = 'text';
      return;
    }

    try {
      let html = '';

      if (format === 'markdown') {
        const [{ marked }, { default: DOMPurify }] = await Promise.all([
          import('marked'),
          import('dompurify'),
        ]);
        const raw = await marked.parse(content, { async: true });
        html = ensurePurifyHook(DOMPurify).sanitize(raw, PURIFY_CONFIG);
      } else if (format === 'html') {
        const { default: DOMPurify } = await import('dompurify');
        html = ensurePurifyHook(DOMPurify).sanitize(content, PURIFY_CONFIG);
      } else if (format === 'code') {
        html = await highlight(content, language || 'plaintext');
      }

      if (id !== this._renderId) return;
      this._renderedHtml = html;
      this._renderFormat = format;
    } catch (err) {
      logger.error('[ContentDrawer] Failed to render content:', err);
      if (id !== this._renderId) return;
      this._renderedHtml = '';
      this._renderFormat = 'text';
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('sw-content-drawer-close', { bubbles: true, composed: true }));
  }

  private async _copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.content);
      this._copied = true;
      setTimeout(() => { this._copied = false; }, 2000);
    } catch {
      logger.error('[ContentDrawer] Clipboard write failed');
    }
  }

  private _renderBody() {
    if (this.format === 'text' || (this._renderFormat !== this.format)) {
      // Show plain text immediately; highlighted version replaces it once ready.
      return html`<div class="content-text">${this.content}</div>`;
    }
    if (this._renderFormat === 'code') {
      return html`
        <div class="content-code">
          <pre><code>${unsafeHTML(this._renderedHtml)}</code></pre>
        </div>
      `;
    }
    return html`<div class="content-rich">${unsafeHTML(this._renderedHtml)}</div>`;
  }

  render() {
    const showLangBadge = this.format === 'code' && this.language;

    return html`
      <div class="panel" part="panel">
        <div class="header" part="header">
          ${this.title
            ? html`<span class="title" part="title">${this.title}</span>`
            : nothing}
          ${showLangBadge
            ? html`<span class="lang-badge">${this.language}</span>`
            : nothing}
          <button
            class="action-btn ${this._copied ? 'copy-done' : ''}"
            title="Copy to clipboard"
            @click=${this._copy}
          >
            <sw-ui-icon name=${this._copied ? 'check-circle' : 'copy'} size="16"></sw-ui-icon>
          </button>
          <button class="action-btn" title="Close" @click=${this._close}>
            <sw-ui-icon name="close" size="16"></sw-ui-icon>
          </button>
        </div>
        <div class="body" part="body">
          ${this._renderBody()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-content-drawer': SwUiContentDrawer;
  }
}
