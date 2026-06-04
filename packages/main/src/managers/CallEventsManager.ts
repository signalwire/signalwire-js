import { distinctUntilChanged, filter, map, merge, tap } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { isSelfParticipant } from '../core/entities/Participant';
import {
  isCallJoinedPayload,
  isLayoutChangedPayload
} from '../core/RPCMessages/guards/events.guards';
import { filterAs } from '../operators';
import { filterNull } from '../operators/filterNull';
import { getLogger } from '../utils/logger';

import type { Participant, SelfParticipant } from '../core/entities/Participant';
import type {
  CallManager,
  CallParticipant,
  CallSelfParticipant
} from '../core/entities/types/call.types';
import type {
  LayoutLayer,
  Member,
  RoomSession,
  Layout,
  MemberTalkingInfo
} from '../core/RPCMessages/types/common';
import type { CallLayoutListResponse } from '../core/RPCMessages/types/methods';
import type { Capability } from '../core/types/call.types';
import type { Observable } from 'rxjs';

const logger = getLogger();

type SessionState = RoomSession & { capabilities: Capability[] } & {
  layouts: string[];
} & { layout_layers: LayoutLayer[] };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WebRTCCallEventManagerOptions {}

const initialSessionState: Partial<SessionState> = {};

/** @internal */
export class CallEventsManager extends Destroyable {
  private selfId?: string;
  private originCallId?: string;
  private callIds = new Set<string>();
  private roomSessionIds = new Set<string>();
  private _participants$ = this.createBehaviorSubject<Record<string, Participant>>({});

  private _self$ = this.createBehaviorSubject<SelfParticipant | null>(null);
  private _sessionState$ = this.createBehaviorSubject<Partial<SessionState>>(initialSessionState);

  constructor(
    protected webRtcCallSession: CallManager,
    protected options: WebRTCCallEventManagerOptions = {}
  ) {
    super();
    this.initSubscriptions();
  }
  public get participants$(): Observable<CallParticipant[]> {
    return this.cachedObservable('participants$', () =>
      this._participants$
        .asObservable()
        .pipe(map((participantsRecord) => Object.values(participantsRecord)))
    );
  }

  public get participants(): CallParticipant[] {
    return Object.values(this._participants$.value);
  }

  public get self$(): Observable<CallSelfParticipant> {
    return this.cachedObservable('self$', () => this._self$.asObservable().pipe(filterNull()));
  }

  // check if this call session has joined that same room session
  public isRoomSessionIdValid(roomSessionId: string): boolean {
    return this.roomSessionIds.has(roomSessionId);
  }

  public addCallId(callId: string): void {
    this.callIds.add(callId);
  }

  public isCallIdValid(callId: string): boolean {
    return this.callIds.has(callId);
  }

  public get recording$(): Observable<boolean> {
    return this.cachedObservable('recording$', () =>
      this._sessionState$.pipe(
        map((state) => state.recording),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get recordings$(): Observable<Record<string, unknown>[]> {
    return this.cachedObservable('recordings$', () =>
      this._sessionState$.pipe(
        map((state) => state.recordings),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get streaming$(): Observable<boolean> {
    return this.cachedObservable('streaming$', () =>
      this._sessionState$.pipe(
        map((state) => state.streaming),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get streams$(): Observable<Record<string, unknown>[]> {
    return this.cachedObservable('streams$', () =>
      this._sessionState$.pipe(
        map((state) => state.streams),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get playbacks$(): Observable<Record<string, unknown>[]> {
    return this.cachedObservable('playbacks$', () =>
      this._sessionState$.pipe(
        map((state) => state.playbacks),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get raiseHandPriority$(): Observable<boolean> {
    return this.cachedObservable('raiseHandPriority$', () =>
      this._sessionState$.pipe(
        map((state) => state.prioritize_handraise),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get locked$(): Observable<boolean> {
    return this.cachedObservable('locked$', () =>
      this._sessionState$.pipe(
        map((state) => state.locked),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get meta$(): Observable<Record<string, unknown>> {
    return this.cachedObservable('meta$', () =>
      this._sessionState$.pipe(
        map((state) => state.meta),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get capabilities$(): Observable<Capability[]> {
    return this.cachedObservable('capabilities$', () =>
      this._sessionState$.pipe(
        map((state) => state.capabilities),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get layout$(): Observable<string> {
    return this.cachedObservable('layout$', () =>
      this._sessionState$.pipe(
        map((state) => state.layout_name),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get layouts$(): Observable<string[]> {
    return this.cachedObservable('layouts$', () =>
      this._sessionState$.pipe(
        map((state) => state.layouts),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get layoutLayers$(): Observable<LayoutLayer[]> {
    return this.cachedObservable('layoutLayers$', () =>
      this._sessionState$.pipe(
        map((state) => state.layout_layers),
        distinctUntilChanged(),
        filterNull()
      )
    );
  }

  public get self(): CallSelfParticipant | null {
    return this._self$.value;
  }

  public get layoutLayers(): LayoutLayer[] {
    return this._sessionState$.value.layout_layers ?? [];
  }

  public get recording(): boolean {
    return this._sessionState$.value.recording ?? false;
  }

  public get streaming(): boolean {
    return this._sessionState$.value.streaming ?? false;
  }

  public get raiseHandPriority(): boolean {
    return this._sessionState$.value.prioritize_handraise ?? false;
  }

  public get locked(): boolean {
    return this._sessionState$.value.locked ?? false;
  }

  public get meta(): Record<string, unknown> {
    return this._sessionState$.value.meta ?? {};
  }

  public get layout(): string | undefined {
    return this._sessionState$.value.layout_name;
  }

  public get layouts(): string[] {
    return this._sessionState$.value.layouts ?? [];
  }

  public get capabilities(): Capability[] {
    return this._sessionState$.value.capabilities ?? [];
  }

  public isSessionEvent(id: string): boolean {
    return this.callIds.has(id) || this.roomSessionIds.has(id);
  }

  protected initSubscriptions(): void {
    this.subscribeTo(this.callJoinedEvent$, (callJoinedEvent) => {
      logger.debug('[CallEventsManager] Handling call.joined event for call/session IDs:', {
        callId: callJoinedEvent.call_id,
        roomSessionId: callJoinedEvent.room_session_id
      });
      const sessionState = callJoinedEvent.room_session;
      const capabilities = callJoinedEvent.capabilities as Capability[];
      // Don't update selfId and originCallId from nested call.joined events
      this.selfId = this.selfId ?? callJoinedEvent.member_id;
      this.originCallId = this.originCallId ?? callJoinedEvent.origin_call_id;
      this.callIds.add(callJoinedEvent.call_id);
      this.roomSessionIds.add(callJoinedEvent.room_session_id);

      this._sessionState$.next({
        ...this._sessionState$.value,
        recording: sessionState.recording,
        recordings: sessionState.recordings,
        streaming: sessionState.streaming,
        streams: sessionState.streams,
        playbacks: sessionState.playbacks,

        prioritize_handraise: sessionState.prioritize_handraise,
        locked: sessionState.locked,
        meta: sessionState.meta,

        capabilities
      });

      this.updateParticipants(sessionState.members);

      // Update capabilities on the self participant
      // This must happen after updateParticipants to ensure self exists
      this._self$.value?.capabilities.updateFromRaw(capabilities);

      if (this._self$.value?.capabilities.setLayout) {
        this.updateLayouts();
      }
    });
    this.subscribeTo(this.memberUpdates$, (member) => {
      logger.debug('[CallEventsManager] Handling member update event for member ID:', member);
      this.upsertParticipant(member);
    });
    this.subscribeTo(this.webRtcCallSession.memberLeft$, (memberLeftEvent) => {
      logger.debug(
        '[CallEventsManager] Handling member.left event for member ID:',
        memberLeftEvent.member.member_id
      );
      const participants = { ...this._participants$.value };
      if (memberLeftEvent.member.member_id in participants) {
        delete participants[memberLeftEvent.member.member_id];
        // in case in subscription is observing the participants collection
        this._participants$.next(participants);
      } else {
        logger.warn(
          `[CallEventsManager] Received member.left event for unknown member ID: ${memberLeftEvent.member.member_id}`
        );
      }
    });
    this.subscribeTo(this.webRtcCallSession.callUpdated$, (callUpdatedEvent) => {
      logger.debug('[CallEventsManager] Handling call.updated event:', callUpdatedEvent);
      const roomSession = callUpdatedEvent.room_session;

      this._sessionState$.next({
        ...this._sessionState$.value,
        recording: roomSession.recording,
        recordings: roomSession.recordings,
        streaming: roomSession.streaming,
        streams: roomSession.streams,
        playbacks: roomSession.playbacks,
        prioritize_handraise: roomSession.prioritize_handraise,
        locked: roomSession.locked,
        meta: roomSession.meta
      });
    });
    this.subscribeTo(this.layoutChangedEvent$, (layoutChangedEvent) => {
      logger.debug('[CallEventsManager] Handling layout.changed event:', layoutChangedEvent);
      this._sessionState$.next({
        ...this._sessionState$.value,

        layout_name: layoutChangedEvent.id,

        layout_layers: layoutChangedEvent.layers
      });

      this.updateParticipantPositions(layoutChangedEvent);
    });
  }
  private updateParticipantPositions(layoutChangedEvent: Layout) {
    if (
      Object.keys(this._participants$.value).length > 0 &&
      !layoutChangedEvent.layers.some((layer) => !!layer.member_id)
    ) {
      logger.warn(
        '[CallEventsManager] No layers with member_id found in layout.changed event. Nothing to update.'
      );
    }
    layoutChangedEvent.layers
      .filter((layer): layer is LayoutLayer & { member_id: string } => !!layer.member_id)
      .filter((layer) => {
        if (!(layer.member_id in this._participants$.value)) {
          logger.warn(
            `[CallEventsManager] Skipping layout layer for unknown member_id: ${layer.member_id}`
          );
          return false;
        }
        return true;
      })
      .map((layer) => {
        // update participant state with new position
        this._participants$.value[layer.member_id].upnext({
          position: layer
        });
        return this._participants$.value[layer.member_id];
      })
      .forEach((participant) => {
        if (isSelfParticipant(participant)) {
          this._self$.next(participant);
        }
        // update the collection observable to notify changes
        this._participants$.next({
          ...this._participants$.value,
          [participant.id]: participant
        });
      });
  }

  updateLayouts(): void {
    if (!this.selfId) return;

    this.webRtcCallSession
      .executeMethod<CallLayoutListResponse>(this.selfId, 'call.layout.list', {})
      .then((response) => {
        this._sessionState$.next({
          ...this._sessionState$.value,
          layouts: response.result.layouts
        });
      })
      .catch((error) => {
        logger.error('[CallEventsManager] Error fetching layouts:', error);
      });
  }

  private updateParticipants(members: Member[]) {
    members.forEach((member) => this.upsertParticipant(member));
  }

  private upsertParticipant(member: Member | MemberTalkingInfo) {
    if (!(member.member_id in this._participants$.value)) {
      // Pass selfId from call.joined event to ensure correct self participant identification
      const newParticipant = this.webRtcCallSession.createParticipant(
        member.member_id,
        this.selfId
      );

      this._participants$.next({
        ...this._participants$.value,
        [member.member_id]: newParticipant
      });
    }

    const participant = this._participants$.value[member.member_id];

    const oldValue = participant.value;
    logger.debug('[CallEventsManager] Updating participant:', member.member_id, {
      oldValue,
      newValue: member
    });
    participant.upnext({
      ...oldValue,
      ...member
    });

    if (isSelfParticipant(participant)) {
      this._self$.next(participant);
    }
    // in case in subscription is observing the participants collection
    this._participants$.next(this._participants$.value);
  }

  private get callJoinedEvent$() {
    return this.cachedObservable('callJoinedEvent$', () =>
      this.webRtcCallSession.callEvent$.pipe(
        filter(isCallJoinedPayload),
        tap((event) => {
          logger.debug('[CallEventsManager] Call joined event:', event);
        })
      )
    );
  }

  private get layoutChangedEvent$() {
    return this.cachedObservable('layoutChangedEvent$', () =>
      this.webRtcCallSession.callEvent$.pipe(
        filterAs(isLayoutChangedPayload, 'layout'),
        tap((event) => {
          logger.debug('[CallEventsManager] Layout changed event:', event);
        })
      )
    );
  }

  private get memberUpdates$() {
    return this.cachedObservable('memberUpdates$', () =>
      merge(
        this.webRtcCallSession.memberJoined$,
        this.webRtcCallSession.memberUpdated$,
        this.webRtcCallSession.memberTalking$
      ).pipe(
        map((event) => event.member),
        tap((event) => {
          logger.debug('[CallEventsManager] Member update event:', event);
        })
      )
    );
  }

  public override destroy(): void {
    const participants = Object.values(this._participants$.value);
    participants.forEach((participant) => {
      participant.destroy();
    });
    this._participants$.next({});
    this._self$.next(null);

    this.callIds.clear();
    this.roomSessionIds.clear();
    this.selfId = undefined;
    this.originCallId = undefined;
    //@ts-expect-error -- avoiding circular references
    this.webRtcCallSession = undefined;
    //@ts-expect-error -- avoiding circular references
    this.callSession = undefined;

    super.destroy();
  }
}
