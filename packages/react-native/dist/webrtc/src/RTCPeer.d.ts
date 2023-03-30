import { EventEmitter } from '@signalwire/core';
import { BaseConnection } from './BaseConnection';
export default class RTCPeer<EventTypes extends EventEmitter.ValidEventTypes> {
    call: BaseConnection<EventTypes>;
    type: RTCSdpType;
    uuid: string;
    instance: RTCPeerConnection;
    private options;
    private _iceTimeout;
    private _negotiating;
    private _processingRemoteSDP;
    private needResume;
    private _restartingIce;
    private _watchMediaPacketsTimer;
    private _connectionStateTimer;
    private _mediaWatcher;
    /**
     * Both of these properties are used to have granular
     * control over when to `resolve` and when `reject` the
     * `start()` method.
     */
    private _resolveStartMethod;
    private _rejectStartMethod;
    private _localStream?;
    private _remoteStream?;
    private get logger();
    constructor(call: BaseConnection<EventTypes>, type: RTCSdpType);
    get watchMediaPacketsTimeout(): number;
    get localStream(): MediaStream | undefined;
    set localStream(stream: MediaStream | undefined);
    get remoteStream(): MediaStream | undefined;
    get isOffer(): boolean;
    get isAnswer(): boolean;
    get isSimulcast(): boolean;
    get isSfu(): boolean;
    get localVideoTrack(): MediaStreamTrack | null;
    get localAudioTrack(): MediaStreamTrack | null;
    get remoteVideoTrack(): MediaStreamTrack | null;
    get remoteAudioTrack(): MediaStreamTrack | null;
    get hasAudioSender(): boolean;
    get hasVideoSender(): boolean;
    get hasAudioReceiver(): boolean;
    get hasVideoReceiver(): boolean;
    get config(): RTCConfiguration;
    get localSdp(): string | undefined;
    get remoteSdp(): string | undefined;
    get hasIceServers(): boolean;
    stopTrackSender(kind: string): void;
    restoreTrackSender(kind: string): Promise<void>;
    getDeviceId(kind: string): string | null;
    getTrackSettings(kind: string): MediaTrackSettings | null;
    getDeviceLabel(kind: string): string | null;
    restartIceWithRelayOnly(): void;
    restartIce(): void;
    triggerResume(): void;
    private resetNeedResume;
    stopWatchMediaPackets(): void;
    startWatchMediaPackets(): void;
    applyMediaConstraints(kind: string, constraints: MediaTrackConstraints): Promise<void>;
    private _getSenderByKind;
    private _getReceiverByKind;
    startNegotiation(force?: boolean): Promise<void>;
    onRemoteBye({ code, message }: {
        code: string;
        message: string;
    }): void;
    onRemoteSdp(sdp: string): Promise<void>;
    private _setupRTCPeerConnection;
    start(): Promise<unknown>;
    detachAndStop(): void;
    stop(): void;
    private _supportsAddTransceiver;
    private _checkMediaToNegotiate;
    private _sdpReady;
    private _sdpIsValid;
    private _forceNegotiation;
    private _onIceTimeout;
    private _onIce;
    private _setLocalDescription;
    private _setRemoteDescription;
    private _retrieveLocalStream;
    private _attachListeners;
    private clearTimers;
    private clearConnectionStateTimer;
    private clearWatchMediaPacketsTimer;
    private emitMediaConnected;
}
//# sourceMappingURL=RTCPeer.d.ts.map