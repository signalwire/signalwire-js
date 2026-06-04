/**
 * Directory Component
 *
 * A searchable list of addresses from the directory service.
 * Supports filtering, selection, and pagination.
 *
 * @example
 * ```html
 * <sw-directory .directory=${directory}></sw-directory>
 * ```
 *
 * @fires sw-address-select - Fired when an address is selected. Detail: `{ address: Address }`
 * @fires sw-dial - Fired when the call button on an address is clicked. Detail: `{ address: Address, channel: string }`
 *
 * @cssprop [--interactive-button-primary-bg=#044ef4] - Primary brand color
 * @cssprop [--interactive-button-primary-hover=#0342cf] - Primary color on hover
 * @cssprop [--interactive-status-success=#22c55e] - Success/positive color
 * @cssprop [--fg-default=#f0f0f4] - Primary text color
 * @cssprop [--fg-muted=#a0a0aa] - Secondary/muted text color
 * @cssprop [--bg-surface=#181a28] - Component background color
 * @cssprop [--bg-surface-raised=#222436] - Background color on hover
 * @cssprop [--interactive-dropdown-hover=#333338] - Background color on active/press
 * @cssprop [--border-default=rgba(255,255,255,0.12)] - Border color
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Subscription } from 'rxjs';
import type { Observable } from 'rxjs';
import './UI/icons/sw-ui-icon.js';
import { hostReset } from './UI/host-reset.js';

/**
 * Address type from SDK
 */
export interface Address {
  id: string;
  name: string;
  displayName?: string;
  type?: 'room' | 'person';
  channels?: {
    audio?: boolean;
    video?: boolean;
    messaging?: boolean;
  };
}

/**
 * Directory interface for component
 */
export interface DirectoryService {
  addresses$: Observable<Address[]>;
  loading$?: Observable<boolean>;
  hasMore$?: Observable<boolean>;
  loadMore?(): Promise<void>;
}

@customElement('sw-directory')
export class SwDirectory extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: block;
      font-family: var(--type-family-body);
      color: var(--fg-default);
    }

    .container {
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-3);
      border-bottom: 1px solid var(--border-default);
    }

    .search-input {
      flex: 1;
      padding: var(--sp-2) var(--sp-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--fg-default);
      font-family: var(--type-family-body);
      font-size: var(--type-size-small);
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--interactive-button-primary-bg);
    }

    .search-input::placeholder {
      color: var(--fg-muted);
    }

    .list {
      display: flex;
      flex-direction: column;
      max-height: 400px;
      overflow-y: auto;
    }

    .item {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border-default);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .item:last-child {
      border-bottom: none;
    }

    .item:hover {
      background: var(--bg-surface-raised);
    }

    .item:active {
      background: var(--interactive-dropdown-hover);
    }

    .item.selected {
      background: var(--interactive-button-primary-bg);
      color: white;
    }

    .item.selected .item-type,
    .item.selected .item-channels {
      color: rgba(255, 255, 255, 0.8);
    }

    .item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-surface-raised);
      color: var(--fg-muted);
      flex-shrink: 0;
    }

    .item.selected .item-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .item-icon svg,
    .item-icon sw-ui-icon {
      width: 20px;
      height: 20px;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-size: var(--type-size-small);
      font-weight: 500;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-type {
      font-size: var(--type-size-caption);
      color: var(--fg-muted);
      text-transform: capitalize;
    }

    .item-channels {
      display: flex;
      gap: var(--sp-1);
      color: var(--fg-muted);
    }

    .item-channels sw-ui-icon {
      width: 16px;
      height: 16px;
    }

    .item-channels sw-ui-icon.active {
      color: var(--interactive-status-success);
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--sp-4);
      color: var(--fg-muted);
      font-size: var(--type-size-small);
    }

    .scroll-sentinel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--sp-3);
      min-height: 1px;
    }

    .scroll-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-2);
      padding: var(--sp-3);
      color: var(--fg-muted);
      font-size: var(--type-size-caption);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-default);
      border-top-color: var(--interactive-button-primary-bg);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .dial-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--interactive-status-success);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 0.15s ease;
    }

    .dial-button:hover {
      background: #0ea472;
    }

    .dial-button sw-ui-icon {
      pointer-events: none;
    }
  `];

  /**
   * Directory service with addresses$ observable
   */
  @property({ type: Object })
  directory: DirectoryService | null = null;

  /**
   * Currently selected address
   */
  @state()
  private selectedAddress: Address | null = null;

  /**
   * Search filter query
   */
  @state()
  private searchQuery: string = '';

  /**
   * List of addresses from directory
   */
  @state()
  private addresses: Address[] = [];

  /**
   * Loading state
   */
  @state()
  private loading: boolean = false;

  /**
   * Has more addresses to load
   */
  @state()
  private hasMore: boolean = false;

  /**
   * RxJS subscriptions for cleanup
   */
  private subscriptions: Subscription[] = [];

  /**
   * Debounce timer for search
   */
  private searchDebounceTimer: number | null = null;

  /**
   * IntersectionObserver for infinite scroll
   */
  private intersectionObserver: IntersectionObserver | null = null;

  /**
   * Flag to track if we're auto-loading for search
   */
  @state()
  private isAutoLoadingForSearch: boolean = false;

  connectedCallback() {
    super.connectedCallback();
    this.subscribeToDirectory();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private subscribeToDirectory() {
    if (!this.directory) return;

    // Subscribe to addresses
    if (this.directory.addresses$) {
      const addressesSub = this.directory.addresses$.subscribe((addresses) => {
        this.addresses = addresses;
      });
      this.subscriptions.push(addressesSub);
    }

    // Subscribe to loading state
    if (this.directory.loading$) {
      const loadingSub = this.directory.loading$.subscribe((loading) => {
        this.loading = loading;
      });
      this.subscriptions.push(loadingSub);
    }

    // Subscribe to hasMore
    if (this.directory.hasMore$) {
      const hasMoreSub = this.directory.hasMore$.subscribe((hasMore) => {
        this.hasMore = hasMore;
      });
      this.subscriptions.push(hasMoreSub);
    }

    // Load initial data
    if (this.directory.loadMore) {
      this.directory.loadMore();
    }
  }

  private cleanup() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  protected firstUpdated() {
    this.setupInfiniteScroll();
  }

  private setupInfiniteScroll() {
    const sentinel = this.shadowRoot?.querySelector('.scroll-sentinel');
    if (!sentinel) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && this.hasMore && !this.loading) {
          this.handleLoadMore();
        }
      },
      {
        root: this.shadowRoot?.querySelector('.list'),
        rootMargin: '100px',
        threshold: 0
      }
    );

    this.intersectionObserver.observe(sentinel);
  }

  protected updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // Handle directory property changes
    if (changedProperties.has('directory')) {
      this.cleanup();
      this.subscribeToDirectory();
    }

    // Re-setup infinite scroll if needed
    if (!this.intersectionObserver) {
      this.setupInfiniteScroll();
    }

    // Auto-load more when searching and no results found but more available
    // Also check when loading state changes so we can trigger subsequent loads
    if (
      changedProperties.has('addresses') ||
      changedProperties.has('searchQuery') ||
      changedProperties.has('loading')
    ) {
      this.checkAutoLoadForSearch();
    }
  }

  private async checkAutoLoadForSearch() {
    // If we have a search query, no filtered results, but more to load, keep loading
    // Note: !this.loading prevents concurrent loads, isAutoLoadingForSearch is for UI state only
    if (
      this.searchQuery.trim() &&
      this.filteredAddresses.length === 0 &&
      this.hasMore &&
      !this.loading
    ) {
      this.isAutoLoadingForSearch = true;
      await this.handleLoadMore();
      // The updated() will be called again when addresses/loading change, continuing the loop
    } else if (this.filteredAddresses.length > 0 || !this.hasMore) {
      this.isAutoLoadingForSearch = false;
    }
  }

  private get filteredAddresses(): Address[] {
    if (!this.searchQuery.trim()) {
      return this.addresses;
    }
    const query = this.searchQuery.toLowerCase();
    return this.addresses.filter(
      (addr) =>
        addr.name.toLowerCase().includes(query) ||
        (addr.displayName && addr.displayName.toLowerCase().includes(query))
    );
  }

  private handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;

    // Debounce search
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      this.searchQuery = input.value;
    }, 200);
  }

  private handleItemClick(address: Address) {
    this.selectedAddress = address;

    this.dispatchEvent(
      new CustomEvent('sw-address-select', {
        detail: { address },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleItemDoubleClick(address: Address) {
    this.handleDial(address);
  }

  private handleDial(address: Address) {
    this.dispatchEvent(
      new CustomEvent('sw-dial', {
        detail: { address },
        bubbles: true,
        composed: true
      })
    );
  }

  private async handleLoadMore() {
    if (this.directory?.loadMore) {
      await this.directory.loadMore();
    }
  }

  private renderAddressIcon(address: Address) {
    const name = address.type === 'room' ? 'room' : 'person';
    return html`<sw-ui-icon name=${name} size="20"></sw-ui-icon>`;
  }

  private renderChannelIcons(address: Address) {
    const channels = address.channels || {};
    return html`
      <div class="item-channels">
        <sw-ui-icon
          name="mic-on"
          size="16"
          class="${channels.audio ? 'active' : ''}"
          title="Audio"
        ></sw-ui-icon>
        <sw-ui-icon
          name="camera-on"
          size="16"
          class="${channels.video ? 'active' : ''}"
          title="Video"
        ></sw-ui-icon>
      </div>
    `;
  }

  private renderLoadingIndicator() {
    return html`
      <div class="scroll-loading">
        <div class="spinner"></div>
        <span>${this.isAutoLoadingForSearch ? 'Searching...' : 'Loading more...'}</span>
      </div>
    `;
  }

  render() {
    const showInitialLoading = this.loading && this.addresses.length === 0;
    const showEmptyState = !this.loading && this.filteredAddresses.length === 0 && !this.hasMore;
    const showSearchingState = this.isAutoLoadingForSearch && this.filteredAddresses.length === 0;

    return html`
      <div class="container" part="container">
        <div class="search" part="search">
          <input
            type="text"
            class="search-input"
            placeholder="Search addresses..."
            @input=${this.handleSearchInput}
            aria-label="Search addresses"
          />
        </div>

        <div class="list" part="list" role="listbox">
          ${showInitialLoading
            ? html`<div class="loading">Loading...</div>`
            : showSearchingState
              ? this.renderLoadingIndicator()
              : showEmptyState
                ? html`<div class="empty">No addresses found</div>`
                : html`
                    ${this.filteredAddresses.map(
                      (address) => html`
                        <div
                          class="item ${this.selectedAddress?.id === address.id ? 'selected' : ''}"
                          part="item ${this.selectedAddress?.id === address.id
                            ? 'item-selected'
                            : ''}"
                          role="option"
                          aria-selected="${this.selectedAddress?.id === address.id}"
                          @click=${() => this.handleItemClick(address)}
                          @dblclick=${() => this.handleItemDoubleClick(address)}
                        >
                          <div class="item-icon">${this.renderAddressIcon(address)}</div>
                          <div class="item-content">
                            <div class="item-name" part="item-name">
                              ${address.displayName || address.name}
                            </div>
                            <div class="item-type" part="item-type">
                              ${address.type || 'address'}
                            </div>
                          </div>
                          ${this.renderChannelIcons(address)}
                          <button
                            class="dial-button"
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this.handleDial(address);
                            }}
                            aria-label="Call ${address.displayName || address.name}"
                          >
                            <sw-ui-icon name="phone-call" size="18"></sw-ui-icon>
                          </button>
                        </div>
                      `
                    )}
                    <!-- Scroll sentinel for infinite scroll -->
                    <div class="scroll-sentinel">
                      ${this.loading && !this.isAutoLoadingForSearch
                        ? this.renderLoadingIndicator()
                        : null}
                    </div>
                  `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-directory': SwDirectory;
  }
}
