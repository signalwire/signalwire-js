import { BaseComponent, BaseComponentOptions, BaseConnectionState, Rooms, EventEmitter, BaseConnectionContract, WebRTCMethod } from '@signalwire/core';
import type { ReduxComponent } from '@signalwire/core';
import RTCPeer from './RTCPeer';
import { ConnectionOptions } from './utils/interfaces';
interface OnVertoByeParams {
    byeCause: string;
    byeCauseCode: string;
    rtcPeerId: string;
    redirectDestination?: string;
}
export declare type MediaEvent = 'media.connected' | 'media.reconnecting' | 'media.disconnected';
declare type EventsHandlerMapping = Record<BaseConnectionState, (params: any) => void> & Record<MediaEvent, () => void>;
export declare type BaseConnectionStateEventTypes = {
    [k in keyof EventsHandlerMapping]: EventsHandlerMapping[k];
};
export declare type BaseConnectionOptions<EventTypes extends EventEmitter.ValidEventTypes> = ConnectionOptions & BaseComponentOptions<EventTypes & BaseConnectionStateEventTypes>;
export declare class BaseConnection<EventTypes extends EventEmitter.ValidEventTypes> extends BaseComponent<EventTypes & BaseConnectionStateEventTypes> implements Rooms.BaseRoomInterface<EventTypes & BaseConnectionStateEventTypes>, BaseConnectionContract<EventTypes & BaseConnectionStateEventTypes> {
    direction: 'inbound' | 'outbound';
    options: BaseConnectionOptions<EventTypes & BaseConnectionStateEventTypes>;
    /** @internal */
    cause: string;
    /** @internal */
    causeCode: string;
    /** @internal */
    gotEarly: boolean;
    /** @internal */
    doReinvite: boolean;
    /** @internal */
    protected _eventsPrefix: "video";
    private state;
    private prevState;
    private activeRTCPeerId;
    private rtcPeerMap;
    private sessionAuthTask;
    private resuming;
    constructor(options: BaseConnectionOptions<EventTypes & BaseConnectionStateEventTypes>);
    get id(): string;
    get active(): boolean;
    get trying(): boolean;
    get memberId(): any;
    get previewUrl(): any;
    get roomId(): any;
    get roomSessionId(): any;
    get callId(): string;
    get localStream(): MediaStream | undefined;
    set localStream(stream: MediaStream | undefined);
    get remoteStream(): MediaStream | undefined;
    get iceServers(): RTCIceServer[];
    get component(): ReduxComponent;
    /** @internal */
    dialogParams(rtcPeerId: string): {
        dialogParams: {
            id: string;
            destinationNumber: string | undefined;
            attach: boolean | undefined;
            callerName: string | undefined;
            callerNumber: string | undefined;
            remoteCallerName: string | undefined;
            remoteCallerNumber: string | undefined;
            userVariables: {
                [key: string]: any;
            } | undefined;
            screenShare: boolean | undefined;
            additionalDevice: boolean | undefined;
            pingSupported: boolean;
            version: number;
        };
    };
    get cameraId(): string | null;
    get cameraLabel(): string | null;
    get microphoneId(): string | null;
    get microphoneLabel(): string | null;
    /** @internal */
    get withAudio(): boolean;
    /** @internal */
    get withVideo(): boolean;
    get localVideoTrack(): MediaStreamTrack | null;
    get localAudioTrack(): MediaStreamTrack | null;
    get peer(): RTCPeer<EventTypes> | undefined;
    set peer(rtcPeer: RTCPeer<EventTypes> | undefined);
    getRTCPeerById(rtcPeerId: string): RTCPeer<EventTypes> | undefined;
    appendRTCPeer(rtcPeer: RTCPeer<EventTypes>): Map<string, RTCPeer<EventTypes>>;
    setActiveRTCPeer(rtcPeerId: string): void;
    /**
     * @internal
     * Verto messages have to be wrapped into an execute
     * request and sent using the proper RPC WebRTCMethod.
     */
    private vertoExecute;
    /** @internal */
    _getRPCMethod(): WebRTCMethod;
    /** @internal */
    _triggerNewRTCPeer(): Promise<void>;
    updateCamera(constraints: MediaTrackConstraints): Promise<void>;
    updateMicrophone(constraints: MediaTrackConstraints): Promise<void>;
    /** @internal */
    private manageSendersWithConstraints;
    /**
     * @internal
     */
    private updateConstraints;
    runRTCPeerWorkers(rtcPeerId: string): void;
    /** @internal */
    invite<T>(): Promise<T>;
    /** @internal */
    answer(): Promise<unknown>;
    /** @internal */
    onLocalSDPReady(rtcPeer: RTCPeer<EventTypes>): void | Promise<void>;
    /** @internal */
    _closeWSConnection(): void;
    private _watchSessionAuth;
    /** @internal */
    resume(): Promise<void>;
    /**
     * Send the `verto.invite` only if the state is either `new` or `requesting`
     *   - new: the first time we send out the offer.
     *   - requesting: we received a redirectDestination so need to send it again
     *     specifying nodeId.
     *
     * @internal
     */
    executeInvite(sdp: string, rtcPeerId: string, nodeId?: string): Promise<void>;
    /** @internal */
    executeUpdateMedia(sdp: string, rtcPeerId: string): Promise<void>;
    hangup(id?: string): Promise<void>;
    /** @internal */
    dtmf(dtmf: string): void;
    /** @internal */
    doReinviteWithRelayOnly(): void;
    /** @internal */
    stopOutboundAudio(): void;
    /** @internal */
    restoreOutboundAudio(): void;
    /** @internal */
    stopOutboundVideo(): void;
    /** @internal */
    restoreOutboundVideo(): void;
    /** @internal */
    setState(state: BaseConnectionState): void;
    /** @internal */
    updateMediaOptions(options: {
        audio?: boolean;
        video?: boolean;
        negotiateAudio?: boolean;
        negotiateVideo?: boolean;
    }): void;
    /** @internal */
    onVertoBye: (params: OnVertoByeParams) => void;
    /**
     * Allow to define logic to munge the SDP
     *
     * @internal
     * */
    private _mungeSDP;
    /**
     * Always use VIDEO_CONSTRAINTS if video: true
     * Always use AUDIO_CONSTRAINTS (or the SS one) if audio: true
     *
     * @internal
     */
    private _checkDefaultMediaConstraints;
    /** @internal */
    protected _finalize(): void;
}
export {};
//# sourceMappingURL=BaseConnection.d.ts.map