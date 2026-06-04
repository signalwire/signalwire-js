import { defer, map, shareReplay, takeUntil, type Observable } from 'rxjs';

import { EntityCollectionTransformed } from '../../behaviors/Collection';
import { Destroyable } from '../../behaviors/Destroyable';
import { filterNull } from '../../operators';
import { DependencyError, UnimplementedError } from '../errors';

import type { CallState } from './types/call.types';
import type { AddressProvider } from '../../interfaces/AddressProvider';
import type {
  ConversationMessageCollection,
  ConversationsProvider
} from '../../interfaces/Conversations';
import type { GetAddressResponse } from '../types/address.types';
import type { ResourceType } from '../types/common.types';
import type {
  AddressHistory,
  AddressHistoryCollection,
  GetConversationMessageResponse,
  TextMessage,
  TextMessageCollection
} from '../types/conversation.types';

type AddressState = GetAddressResponse;
/**
 * Represents a contact or room in the directory.
 *
 * Provides identity metadata, conversation history, text messaging,
 * and activity state for an address entry.
 */
export class Address extends Destroyable {
  private initConversationMessages = async (): Promise<ConversationMessageCollection> => {
    this._conversationMessages =
      this._conversationMessages ??
      (await this.conversationManager.getConversationMessageCollection(this.id));
    if (this._conversationMessages.hasMore) {
      this._conversationMessages.loadMore();
    }
    return this._conversationMessages;
  };

  /** Observable of text messages for this address. Lazily loads conversation data. */
  public textMessages$ = defer(this.initConversationMessages).pipe(
    map(() => this.textMessage),
    shareReplay(1),
    takeUntil(this.destroyed$)
  );
  /** Observable of call history for this address. Lazily loads conversation data. */
  public history$ = defer(this.initConversationMessages).pipe(
    map(() => this.history),
    shareReplay(1),
    takeUntil(this.destroyed$)
  );
  private _conversationMessages?: ConversationMessageCollection;

  private _state$ = this.createBehaviorSubject<AddressState | null>(null);

  private _history$?: AddressHistoryCollection<Address>;

  private _textMessages$?: TextMessageCollection<Address>;

  // FIXME after presence API is available
  // this should be a dynamic view of the address existing calls,
  // independent if the user is on the call or not.
  // private _callsStates$ = this.createBehaviorSubject<CallState[]>([]);

  constructor(
    private readonly addressId: string,
    private conversationManager: ConversationsProvider,
    private addressProvider: AddressProvider<Address>
  ) {
    super();
  }

  /** @internal */
  public upnext(state: Partial<AddressState>): void {
    const update = {
      ...this._state$.value,
      ...state
    } as AddressState;
    this._state$.next(update);
  }

  /** @internal */
  public get state(): AddressState | null {
    return this._state$.value;
  }

  /** Unique address identifier. */
  public get id(): string {
    return this.addressId;
  }
  /** Address name (resource identifier). */
  public get name(): string {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.name;
  }

  /** ISO timestamp of when the address was created. */
  public get createdAt(): string {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.created_at;
  }

  /** Default communication channel URI (video for rooms, audio otherwise). */
  public get defaultChannel(): string | undefined {
    return this.type === 'room' ? this.channels.video : this.channels.audio;
  }

  /** Observable of the human-readable display name. */
  public get displayName$(): Observable<string> {
    return this.cachedObservable('displayName$', () =>
      this._state$.pipe(
        filterNull(),
        map((state) => state.display_name),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Human-readable display name. */
  public get displayName(): string {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.display_name;
  }

  /** Observable of the preview image URL. */
  public get previewUrl$(): Observable<string | undefined> {
    return this.cachedObservable('previewUrl$', () =>
      this._state$.pipe(
        filterNull(),
        map((state) => state.preview_url),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Preview image URL. */
  public get previewUrl(): string | undefined {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.preview_url;
  }

  /** Observable of the cover image URL. */
  public get coverUrl$(): Observable<string | undefined> {
    return this.cachedObservable('coverUrl$', () =>
      this._state$.pipe(
        filterNull(),
        shareReplay(1),
        map((state) => state.cover_url),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Cover image URL. */
  public get coverUrl(): string | undefined {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.cover_url;
  }

  /** Observable of the underlying resource ID. */
  public get resourceId$(): Observable<string> {
    return this.cachedObservable('resourceId$', () =>
      this._state$.pipe(
        filterNull(),
        shareReplay(1),
        map((state) => state.resource_id),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Underlying resource ID. */
  public get resourceId(): string {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.resource_id;
  }

  /** Observable of the resource type (e.g. `'room'`, `'subscriber'`). */
  public get type$(): Observable<ResourceType> {
    return this.cachedObservable('type$', () =>
      this._state$.pipe(
        filterNull(),
        shareReplay(1),
        map((state) => state.type),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Resource type (e.g. `'room'`, `'subscriber'`). */
  public get type(): ResourceType {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.type;
  }

  /** Observable of available communication channels (audio, video, messaging). */
  public get channels$(): Observable<{
    audio?: string;
    messaging?: string;
    video?: string;
  }> {
    return this.cachedObservable('channels$', () =>
      this._state$.pipe(
        filterNull(),
        shareReplay(1),
        map((state) => state.channels),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Available communication channels. */
  public get channels(): {
    audio?: string;
    messaging?: string;
    video?: string;
  } {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.channels;
  }

  /** Whether the address (room) is locked. */
  public get locked(): boolean {
    if (!this._state$.value) {
      throw new DependencyError('state not initialized');
    }
    return this._state$.value.locked;
  }

  /** Observable indicating whether the address (room) is locked. */
  public get locked$(): Observable<boolean> {
    return this.cachedObservable('locked$', () =>
      this._state$.pipe(
        filterNull(),
        shareReplay(1),
        map((state) => state.locked),
        takeUntil(this.destroyed$)
      )
    );
  }

  /**
   * Sends a text message to this address.
   *
   * @param text - The message text to send.
   *
   * @example
   * ```ts
   * await address.sendText('Hello!');
   * ```
   */
  public async sendText(text: string): Promise<void> {
    return this.conversationManager.sendText(text, this.id);
  }

  /**
   * Collection of text messages for this address, with pagination support.
   *
   * Returns `undefined` until {@link textMessages$} has been subscribed to (lazy-loaded).
   * Filters to `'chat'` subtype messages from the conversation.
   *
   * @see {@link textMessages$} to trigger lazy loading.
   * @see {@link sendText} to send a new message.
   */
  public get textMessage():
    | EntityCollectionTransformed<GetConversationMessageResponse, TextMessage<Address>>
    | undefined {
    if (!this._conversationMessages) {
      return;
    }
    this._textMessages$ =
      this._textMessages$ ??
      new EntityCollectionTransformed<GetConversationMessageResponse, TextMessage<Address>>(
        this._conversationMessages,
        (item): item is GetConversationMessageResponse =>
          (item as GetConversationMessageResponse).subtype === 'chat',
        (item) =>
          ({
            id: item.id,
            text: item.text,
            created: item.ts,
            fromAddress$: this.addressProvider.get$(item.from_fabric_address_id)
          }) as TextMessage<Address>
      );
    return this._textMessages$;
  }

  /**
   * Collection of call history entries for this address, with pagination support.
   *
   * Returns `undefined` until {@link history$} has been subscribed to (lazy-loaded).
   * Filters to `'log'` subtype messages including kind, status, start/end times.
   *
   * @see {@link history$} to trigger lazy loading.
   */
  public get history():
    | EntityCollectionTransformed<GetConversationMessageResponse, AddressHistory<Address>>
    | undefined {
    if (!this._conversationMessages) {
      return;
    }
    this._history$ =
      this._history$ ??
      new EntityCollectionTransformed<GetConversationMessageResponse, AddressHistory<Address>>(
        this._conversationMessages,
        (item): item is GetConversationMessageResponse =>
          (item as GetConversationMessageResponse).subtype === 'log',
        (item) =>
          ({
            id: item.id,
            kind: item.kind,
            status: item.details.status,
            started: item.details.start_time,
            ended: item.details.end_time,
            fromAddress$: this.addressProvider.get$(item.from_fabric_address_id)
          }) as AddressHistory<Address>
      );
    return this._history$;
  }

  /** Observable of active call states for this address. @throws {UnimplementedError} Requires presence support. */
  public get activity$(): Observable<CallState[]> {
    // NEEDS Presence
    throw new UnimplementedError();
  }

  /** Active call states for this address. @throws {UnimplementedError} Requires presence support. */
  public get activity(): CallState[] {
    // NEEDS Presence
    throw new UnimplementedError();
  }
}
