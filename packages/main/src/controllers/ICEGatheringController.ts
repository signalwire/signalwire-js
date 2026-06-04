import { filter, map, withLatestFrom } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import {
  DEFAULT_ICE_CANDIDATE_TIMEOUT_MS,
  DEFAULT_ICE_GATHERING_TIMEOUT_MS
} from '../core/constants';
import { isValidLocalDescription } from '../helpers/SDPHelper';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

export interface ICEGatheringControllerOptions {
  iceCandidateTimeout?: number;
  iceGatheringTimeout?: number;
  relayOnly?: boolean;
}

export type ICEGatheringStates = 'new' | 'gathering' | 'complete' | 'timeout';
export interface ICECandidateState {
  state: ICEGatheringStates;
  validSDP: boolean;
}

export class ICEGatheringController extends Destroyable {
  private iceCandidateTimeout: number;
  private iceGatheringTimeout: number;
  private iceCandidateTimer?: ReturnType<typeof setTimeout>;
  private iceGatheringTimer?: ReturnType<typeof setTimeout>;
  private relayOnly: boolean;

  // Event handlers (bound to this instance)
  private onicegatheringstatechangeHandler = () => {
    const { iceGatheringState } = this.peerConnection;
    logger.debug(`[ICEGatheringController] ICE gathering state changed to: ${iceGatheringState}`);
    if (iceGatheringState === 'gathering') {
      this._iceCandidatesState.next({
        state: 'gathering',
        validSDP: false
      });
    }
  };

  private onicecandidateHandler = (event: RTCPeerConnectionIceEvent) => {
    logger.debug('[ICEGatheringController] ICE candidate event received:', event.candidate);
    this.removeTimer('iceCandidateTimer');

    if (event.candidate) {
      this.iceCandidateTimer = setTimeout(() => {
        if (this.peerConnection.iceGatheringState !== 'complete') {
          logger.warn('[ICEGatheringController] ICE candidate timeout, using current SDP');
          this.handleICECandidateTimeout();
        }
      }, this.iceCandidateTimeout);
    } else {
      logger.debug('[ICEGatheringController] ICE gathering completed: null candidate received');
      this.removeTimer('iceGatheringTimer');

      this.handleICEGatheringComplete();
    }
  };

  private _iceCandidatesState = this.createBehaviorSubject<ICECandidateState>({
    state: 'new',
    validSDP: false
  });
  constructor(
    private peerConnection: RTCPeerConnection,
    private peerConnectionControllerNegotiating$: Observable<boolean>,
    options: ICEGatheringControllerOptions = {}
  ) {
    super();
    this.iceCandidateTimeout = options.iceCandidateTimeout ?? DEFAULT_ICE_CANDIDATE_TIMEOUT_MS;
    this.iceGatheringTimeout = options.iceGatheringTimeout ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;
    this.relayOnly = options.relayOnly ?? false;
    // Setup ICE candidate handling
    this.setupEventListeners();
    this.subscribeTo(
      this.peerConnectionControllerNegotiating$.pipe(filter((isNegotiating) => isNegotiating)),
      (isNegotiating) => {
        if (isNegotiating) {
          this.setupEventListeners();
          this.iceGatheringTimer = setTimeout(() => {
            if (this.peerConnection.iceGatheringState !== 'complete') {
              logger.warn('[ICEGatheringController] ICE gathering timeout, using current SDP');
              this.handleICEGatheringTimeout();
            }
          }, this.iceGatheringTimeout);
        }
      }
    );
  }

  private setupEventListeners() {
    this.peerConnection.removeEventListener('icecandidate', this.onicecandidateHandler);
    this.peerConnection.addEventListener('icecandidate', this.onicecandidateHandler);

    // Setup ICE gathering state change handling
    this.peerConnection.removeEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
    this.peerConnection.addEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
  }

  public get iceCandidatesState$(): Observable<ICEGatheringStates> {
    return this._iceCandidatesState.pipe(
      withLatestFrom(this.peerConnectionControllerNegotiating$),
      filter(([_, isNegotiating]) => isNegotiating),
      map(([state, _]) => state.state)
    );
  }

  public get hasValidLocalDescriptionSDP(): boolean {
    const sdp = this.peerConnection.localDescription?.sdp;
    return isValidLocalDescription(sdp ?? '');
  }

  public get isRelayOnly(): boolean {
    return this.relayOnly;
  }

  public setRelayOnly(value: boolean): void {
    this.relayOnly = value;
  }

  private handleICEGatheringComplete(): void {
    logger.debug('[ICEGatheringController] Handling ICE gathering complete');

    logger.debug(
      `[ICEGatheringController] Checking ICE gathering state: ${this.peerConnection.iceGatheringState}`
    );

    logger.debug('[ICEGatheringController] ICE gathering complete');

    this._iceCandidatesState.next({
      state: 'complete',
      validSDP: this.hasValidLocalDescriptionSDP
    });
    this.stopGathering();
  }

  private stopGathering(): void {
    this.peerConnection.removeEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
    this.peerConnection.removeEventListener('icecandidate', this.onicecandidateHandler);
    this.clearAllTimers();
  }

  private handleICEGatheringTimeout(): void {
    this.removeTimer('iceGatheringTimer');

    const validSDP = this.hasValidLocalDescriptionSDP;
    if (validSDP) {
      logger.debug('[ICEGatheringController] Local SDP is valid');
      this._iceCandidatesState.next({
        state: 'timeout',
        validSDP: validSDP
      });
      this.stopGathering();
    } else {
      logger.debug('### ICE gathering timeout\n', this.peerConnection.localDescription?.sdp);
    }
  }

  public handleICECandidateTimeout(): void {
    if (this.iceCandidateTimer) {
      this.removeTimer('iceCandidateTimer');
    }

    logger.warn('[ICEGatheringController] ICE candidate timeout');

    const validSDP = this.hasValidLocalDescriptionSDP;
    if (!validSDP && !this.relayOnly) {
      this.restartICEGatheringWithRelayOnly();
    } else {
      logger.debug('[ICEGatheringController] Using current SDP due to ICE candidate timeout');
      this._iceCandidatesState.next({
        state: 'timeout',
        validSDP: validSDP
      });
      this.stopGathering();
    }
  }

  public restartICEGatheringWithRelayOnly(): void {
    logger.debug('[ICEGatheringController] Restarting ICE gathering with relay-only candidates');
    this.relayOnly = true;
    this.peerConnection.setConfiguration({
      ...this.peerConnection.getConfiguration(),
      iceTransportPolicy: 'relay'
    });
    // Always restart after a policy change — setConfiguration() alone does not
    // re-gather; only a restart actually engages the new iceTransportPolicy.
    // Skipping when connectionState === 'connected' left a degraded-but-connected
    // session stuck with the old (non-relay) candidate set.
    this.peerConnection.restartIce();
  }

  public removeTimer(timer: 'iceGatheringTimer' | 'iceCandidateTimer'): void {
    if (this[timer]) {
      clearTimeout(this[timer]);
      this[timer] = undefined;
    }
  }

  private clearAllTimers(): void {
    logger.debug('[ICEGatheringController] Clearing all timers');

    this.removeTimer('iceGatheringTimer');
    this.removeTimer('iceCandidateTimer');
  }

  public removeEventListeners(): void {
    this.peerConnection.removeEventListener(
      'icegatheringstatechange',
      this.onicegatheringstatechangeHandler
    );
    this.peerConnection.removeEventListener('icecandidate', this.onicecandidateHandler);
  }

  public destroy(): void {
    logger.debug('[ICEGatheringController] Destroying ICEGatheringController');
    this.clearAllTimers();
    this.removeEventListeners();
    super.destroy();
  }
}
