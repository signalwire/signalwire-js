import { describe, it, expect, vi } from 'vitest';
import { Subject, EMPTY } from 'rxjs';

import { CallEventsManager } from './CallEventsManager';
import { Participant } from '../core/entities/Participant';

import type { CallManager } from '../core/entities/types/call.types';
import type { Layout } from '../core/RPCMessages/types/common';

/**
 * Minimal mock of CallManager to construct CallEventsManager.
 * The callEvent$ emits raw event payloads that the guards check.
 */
const createMockCallManager = () => {
  const callEvent$ = new Subject<unknown>();
  const memberLeft$ = new Subject<{ member: { member_id: string } }>();
  const memberJoined$ = new Subject<{ member: { member_id: string } }>();
  const memberUpdated$ = new Subject<{ member: { member_id: string } }>();
  const memberTalking$ = new Subject<{ member: { member_id: string; talking: boolean } }>();
  const callUpdated$ = new Subject<unknown>();

  const mockCallManager = {
    callEvent$: callEvent$.asObservable(),
    memberLeft$: memberLeft$.asObservable(),
    memberJoined$: memberJoined$.asObservable(),
    memberUpdated$: memberUpdated$.asObservable(),
    memberTalking$: memberTalking$.asObservable(),
    callUpdated$: callUpdated$.asObservable(),
    createParticipant: vi.fn((memberId: string) => {
      const executeMethod = vi.fn().mockResolvedValue({});
      const deviceController = {} as any;
      return new Participant(memberId, executeMethod, deviceController);
    }),
    executeMethod: vi.fn().mockResolvedValue({ result: { layouts: [] } })
  } as unknown as CallManager;

  return {
    callManager: mockCallManager,
    callEvent$,
    memberLeft$,
    memberJoined$,
    memberUpdated$,
    memberTalking$,
    callUpdated$
  };
};

describe('CallEventsManager', () => {
  it('BUG: layout.changed with unknown member_id causes null dereference crash', () => {
    // Bug #2: CallEventsManager.ts:356 — updateParticipantPositions accesses
    // this._participants$.value[layer.member_id] without checking if the member
    // exists in the participants map. When a layout.changed event contains a
    // member_id not in the participants map, it crashes with a TypeError.
    //
    // Line 356: this._participants$.value[layer.member_id].upnext({ position: layer })
    // When layer.member_id is not in the map, this returns undefined, and
    // calling .upnext() on undefined throws TypeError.

    const { callManager, callEvent$ } = createMockCallManager();
    const eventsManager = new CallEventsManager(callManager);

    // First, emit a call.joined event to set up participants.
    // isCallJoinedPayload checks: room_session, call_id, member_id, capabilities
    callEvent$.next({
      room_session: {
        recording: false,
        recordings: [],
        streaming: false,
        streams: [],
        playbacks: [],
        prioritize_handraise: false,
        locked: false,
        meta: {},
        members: [
          {
            member_id: 'member-1',
            name: 'User 1',
            type: 'member',
            audio_muted: false,
            video_muted: false,
            deaf: false,
            handraised: false,
            visible: true,
            talking: false,
            isAudience: false,
            input_volume: 50,
            output_volume: 50,
            input_sensitivity: 50,
            echo_cancellation: true,
            auto_gain: true,
            noise_suppression: true,
            lowbitrate: false,
            denoise: false,
            meta: {}
          }
        ]
      },
      call_id: 'call-1',
      room_session_id: 'room-1',
      member_id: 'member-1',
      origin_call_id: 'origin-1',
      capabilities: []
    });

    // Verify participants were set up
    expect(eventsManager.participants.length).toBe(1);

    // Now emit a layout.changed event.
    // isLayoutChangedPayload checks: room_id, room_session_id, layout
    // filterAs extracts the 'layout' property, yielding the Layout object.
    // updateParticipantPositions receives this Layout.
    const layoutChangedPayload = {
      room_id: 'room-1',
      room_session_id: 'room-1',
      layout: {
        id: 'grid-responsive',
        name: 'Grid',
        layers: [
          {
            layer_index: 0,
            z_index: 0,
            member_id: 'member-1', // exists
            playing_file: false,
            position: 'standard-1',
            reservation: '',
            visible: true,
            x: 0,
            y: 0,
            width: 640,
            height: 480
          },
          {
            layer_index: 1,
            z_index: 1,
            member_id: 'unknown-member', // does NOT exist in participants
            playing_file: false,
            position: 'standard-2',
            reservation: '',
            visible: true,
            x: 640,
            y: 0,
            width: 640,
            height: 480
          }
        ]
      } as Layout
    };

    // The error happens inside the RxJS subscription pipeline, so it manifests
    // as an unhandled exception rather than a synchronous throw. We catch it
    // by listening for uncaught errors.
    let caughtError: Error | undefined;
    const errorHandler = (event: ErrorEvent) => {
      caughtError = event.error as Error;
      event.preventDefault(); // prevent vitest from seeing it as unhandled
    };

    // In happy-dom, uncaught errors in setTimeout/promise are exposed differently.
    // We also try a direct approach: access the participants directly.
    // The bug manifests at line 356: this._participants$.value[layer.member_id].upnext(...)
    // where layer.member_id = 'unknown-member' is not in the participants map.
    // We can verify the bug by checking the participants map does NOT contain
    // the unknown member_id, and that the code path accesses it unsafely.

    // Verify 'unknown-member' is not in the participants map
    const participantsMap = (eventsManager as any)._participants$.value;
    expect(participantsMap['unknown-member']).toBeUndefined();

    // The actual crash happens when layout.changed triggers updateParticipantPositions.
    // Since the error is thrown inside an RxJS subscription callback, it won't
    // be caught by a synchronous try/catch. We need to check if calling
    // updateParticipantPositions directly would crash.
    const layoutForTest = {
      id: 'grid-responsive',
      name: 'Grid',
      layers: [
        {
          layer_index: 1,
          z_index: 1,
          member_id: 'unknown-member',
          playing_file: false,
          position: 'standard-2' as any,
          reservation: '',
          visible: true,
          x: 640,
          y: 0,
          width: 640,
          height: 480
        }
      ]
    };

    // Directly call the private method to demonstrate the crash
    expect(() => {
      (eventsManager as any).updateParticipantPositions(layoutForTest);
    }).not.toThrow();

    eventsManager.destroy();
  });
});
