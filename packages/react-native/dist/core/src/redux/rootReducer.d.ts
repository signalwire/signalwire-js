export declare const rootReducer: import("redux").Reducer<import("redux").CombinedState<{
    components: {
        readonly byId: {
            readonly [x: string]: {
                readonly state?: import("..").BaseConnectionState | undefined;
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
    };
    session: {
        readonly authStatus: import("..").SessionAuthStatus;
        readonly protocol: string;
        readonly iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        readonly authState?: {
            readonly type: "video";
            readonly project: string;
            readonly project_id: string;
            readonly scopes: readonly string[];
            readonly scope_id: string;
            readonly resource: string;
            readonly join_as: "member" | "audience";
            readonly user_name: string;
            readonly room?: {
                readonly name: string;
                readonly display_name: string;
                readonly scopes: readonly string[];
                readonly meta: {
                    readonly [x: string]: any;
                };
            } | undefined;
            readonly signature: string;
            readonly expires_at?: number | undefined;
            readonly media_allowed?: import("..").MediaAllowed | undefined;
            readonly audio_allowed: "none" | "receive" | "both";
            readonly video_allowed: "none" | "receive" | "both";
            readonly meta: {
                readonly [x: string]: any;
            };
        } | {
            readonly type: "chat";
            readonly channels: {
                readonly [x: string]: {
                    readonly read?: boolean | undefined;
                    readonly write?: boolean | undefined;
                };
            };
            readonly expires_at: number;
            readonly member_id: string;
            readonly project: string;
            readonly project_id: string;
            readonly resource: string;
            readonly scope_id: string;
            readonly scopes: readonly string[];
            readonly signature: string;
            readonly space_id: string;
            readonly ttl: number;
        } | {
            readonly jti: string;
            readonly project_id: string;
            readonly fabric_subscriber: {
                readonly version: number;
                readonly expires_at: number;
                readonly subscriber_id: string;
                readonly application_id: string;
                readonly project_id: string;
                readonly space_id: string;
            };
        } | undefined;
        readonly authError?: {
            readonly code: number;
            readonly message: string;
        } | undefined;
        readonly authCount: number;
    };
}>, import("redux").AnyAction>;
//# sourceMappingURL=rootReducer.d.ts.map