import { EventEmitter } from '@signalwire/core';
import type RTCPeer from '../RTCPeer';
export declare const watchRTCPeerMediaPackets: <T extends EventEmitter.ValidEventTypes>(rtcPeer: RTCPeer<T>) => {
    start: () => void;
    stop: () => void;
} | undefined;
//# sourceMappingURL=watchRTCPeerMediaPackets.d.ts.map