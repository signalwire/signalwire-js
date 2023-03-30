import type { PayloadAction } from '../../toolkit';
import type { ComponentState, ReduxComponent } from '../../interfaces';
import type { DeepReadonly } from '../../../types';
export declare const initialComponentState: DeepReadonly<ComponentState>;
declare type UpdateComponent = Partial<ReduxComponent> & Pick<ReduxComponent, 'id'>;
declare type CleanupComponentParams = {
    ids: Array<ReduxComponent['id']>;
};
export declare const componentActions: import("../../toolkit/createSlice").CaseReducerActions<{
    upsert: (state: {
        readonly byId: {
            readonly [x: string]: {
                readonly state?: import("../../..").BaseConnectionState | undefined;
                readonly remoteSDP?: string | undefined;
                readonly nodeId?: string | undefined;
                readonly roomId?: string | undefined;
                readonly roomSessionId?: string | undefined;
                readonly memberId?: string | undefined;
                readonly previewUrl?: string | undefined;
                readonly byeCause?: string | undefined;
                readonly byeCauseCode?: number | undefined;
                readonly redirectDestination?: string | undefined;
                readonly audioConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly videoConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                readonly state?: string | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            };
        };
    }, { payload }: PayloadAction<UpdateComponent>) => {
        byId: {
            [x: string]: {
                readonly state?: import("../../..").BaseConnectionState | undefined;
                readonly remoteSDP?: string | undefined;
                readonly nodeId?: string | undefined;
                readonly roomId?: string | undefined;
                readonly roomSessionId?: string | undefined;
                readonly memberId?: string | undefined;
                readonly previewUrl?: string | undefined;
                readonly byeCause?: string | undefined;
                readonly byeCauseCode?: number | undefined;
                readonly redirectDestination?: string | undefined;
                readonly audioConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly videoConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                readonly state?: string | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                state?: import("../../..").BaseConnectionState | undefined;
                remoteSDP?: string | undefined;
                nodeId?: string | undefined;
                roomId?: string | undefined;
                roomSessionId?: string | undefined;
                memberId?: string | undefined;
                previewUrl?: string | undefined;
                byeCause?: string | undefined;
                byeCauseCode?: number | undefined;
                redirectDestination?: string | undefined;
                audioConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                videoConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                id: string;
                responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                state?: string | undefined;
                id: string;
                responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
                remoteSDP?: string | undefined;
                nodeId?: string | undefined;
                roomId?: string | undefined;
                roomSessionId?: string | undefined;
                memberId?: string | undefined;
                previewUrl?: string | undefined;
                byeCause?: string | undefined;
                byeCauseCode?: number | undefined;
                redirectDestination?: string | undefined;
                audioConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                videoConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
            } | {
                state?: string | undefined;
                remoteSDP?: string | undefined;
                nodeId?: string | undefined;
                roomId?: string | undefined;
                roomSessionId?: string | undefined;
                memberId?: string | undefined;
                previewUrl?: string | undefined;
                byeCause?: string | undefined;
                byeCauseCode?: number | undefined;
                redirectDestination?: string | undefined;
                audioConstraints?: MediaTrackConstraints | undefined;
                videoConstraints?: MediaTrackConstraints | undefined;
                id: string;
                responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                state?: string | undefined;
                id: string;
                responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            };
        };
    };
    cleanup: (state: {
        readonly byId: {
            readonly [x: string]: {
                readonly state?: import("../../..").BaseConnectionState | undefined;
                readonly remoteSDP?: string | undefined;
                readonly nodeId?: string | undefined;
                readonly roomId?: string | undefined;
                readonly roomSessionId?: string | undefined;
                readonly memberId?: string | undefined;
                readonly previewUrl?: string | undefined;
                readonly byeCause?: string | undefined;
                readonly byeCauseCode?: number | undefined;
                readonly redirectDestination?: string | undefined;
                readonly audioConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly videoConstraints?: {
                    readonly advanced?: readonly {
                        readonly aspectRatio?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly autoGainControl?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly channelCount?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly deviceId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly echoCancellation?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly facingMode?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly frameRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly groupId?: string | readonly string[] | {
                            readonly exact?: string | readonly string[] | undefined;
                            readonly ideal?: string | readonly string[] | undefined;
                        } | undefined;
                        readonly height?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly latency?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly noiseSuppression?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly sampleRate?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly sampleSize?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                        readonly suppressLocalAudioPlayback?: boolean | {
                            readonly exact?: boolean | undefined;
                            readonly ideal?: boolean | undefined;
                        } | undefined;
                        readonly width?: number | {
                            readonly exact?: number | undefined;
                            readonly ideal?: number | undefined;
                            readonly max?: number | undefined;
                            readonly min?: number | undefined;
                        } | undefined;
                    }[] | undefined;
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                } | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            } | {
                readonly state?: string | undefined;
                readonly id: string;
                readonly responses?: {
                    readonly [x: string]: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                } | undefined;
                readonly errors?: {
                    readonly [x: string]: {
                        readonly action: {
                            readonly payload: any;
                            readonly type: string;
                        };
                        readonly jsonrpc: {
                            readonly jsonrpc: "2.0";
                            readonly id: string;
                            readonly result?: {
                                readonly [x: string]: any;
                            } | undefined;
                            readonly error?: {
                                readonly [x: string]: any;
                            } | undefined;
                        };
                    };
                } | undefined;
            };
        };
    }, { payload }: PayloadAction<CleanupComponentParams>) => {
        byId: {
            [key: string]: ReduxComponent;
        };
    };
}>, componentReducer: import("redux").Reducer<{
    readonly byId: {
        readonly [x: string]: {
            readonly state?: import("../../..").BaseConnectionState | undefined;
            readonly remoteSDP?: string | undefined;
            readonly nodeId?: string | undefined;
            readonly roomId?: string | undefined;
            readonly roomSessionId?: string | undefined;
            readonly memberId?: string | undefined;
            readonly previewUrl?: string | undefined;
            readonly byeCause?: string | undefined;
            readonly byeCauseCode?: number | undefined;
            readonly redirectDestination?: string | undefined;
            readonly audioConstraints?: {
                readonly advanced?: readonly {
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                }[] | undefined;
                readonly aspectRatio?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly autoGainControl?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly channelCount?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly deviceId?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly echoCancellation?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly facingMode?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly frameRate?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly groupId?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly height?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly latency?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly noiseSuppression?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly sampleRate?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly sampleSize?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly suppressLocalAudioPlayback?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly width?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
            } | undefined;
            readonly videoConstraints?: {
                readonly advanced?: readonly {
                    readonly aspectRatio?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly autoGainControl?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly channelCount?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly deviceId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly echoCancellation?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly facingMode?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly frameRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly groupId?: string | readonly string[] | {
                        readonly exact?: string | readonly string[] | undefined;
                        readonly ideal?: string | readonly string[] | undefined;
                    } | undefined;
                    readonly height?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly latency?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly noiseSuppression?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly sampleRate?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly sampleSize?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                    readonly suppressLocalAudioPlayback?: boolean | {
                        readonly exact?: boolean | undefined;
                        readonly ideal?: boolean | undefined;
                    } | undefined;
                    readonly width?: number | {
                        readonly exact?: number | undefined;
                        readonly ideal?: number | undefined;
                        readonly max?: number | undefined;
                        readonly min?: number | undefined;
                    } | undefined;
                }[] | undefined;
                readonly aspectRatio?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly autoGainControl?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly channelCount?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly deviceId?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly echoCancellation?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly facingMode?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly frameRate?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly groupId?: string | readonly string[] | {
                    readonly exact?: string | readonly string[] | undefined;
                    readonly ideal?: string | readonly string[] | undefined;
                } | undefined;
                readonly height?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly latency?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly noiseSuppression?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly sampleRate?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly sampleSize?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
                readonly suppressLocalAudioPlayback?: boolean | {
                    readonly exact?: boolean | undefined;
                    readonly ideal?: boolean | undefined;
                } | undefined;
                readonly width?: number | {
                    readonly exact?: number | undefined;
                    readonly ideal?: number | undefined;
                    readonly max?: number | undefined;
                    readonly min?: number | undefined;
                } | undefined;
            } | undefined;
            readonly id: string;
            readonly responses?: {
                readonly [x: string]: {
                    readonly jsonrpc: "2.0";
                    readonly id: string;
                    readonly result?: {
                        readonly [x: string]: any;
                    } | undefined;
                    readonly error?: {
                        readonly [x: string]: any;
                    } | undefined;
                };
            } | undefined;
            readonly errors?: {
                readonly [x: string]: {
                    readonly action: {
                        readonly payload: any;
                        readonly type: string;
                    };
                    readonly jsonrpc: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                };
            } | undefined;
        } | {
            readonly state?: string | undefined;
            readonly id: string;
            readonly responses?: {
                readonly [x: string]: {
                    readonly jsonrpc: "2.0";
                    readonly id: string;
                    readonly result?: {
                        readonly [x: string]: any;
                    } | undefined;
                    readonly error?: {
                        readonly [x: string]: any;
                    } | undefined;
                };
            } | undefined;
            readonly errors?: {
                readonly [x: string]: {
                    readonly action: {
                        readonly payload: any;
                        readonly type: string;
                    };
                    readonly jsonrpc: {
                        readonly jsonrpc: "2.0";
                        readonly id: string;
                        readonly result?: {
                            readonly [x: string]: any;
                        } | undefined;
                        readonly error?: {
                            readonly [x: string]: any;
                        } | undefined;
                    };
                };
            } | undefined;
        };
    };
}, import("redux").AnyAction>;
export {};
//# sourceMappingURL=componentSlice.d.ts.map