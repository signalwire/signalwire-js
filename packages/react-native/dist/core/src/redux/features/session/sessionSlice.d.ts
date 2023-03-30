import type { PayloadAction, AnyAction } from '../../toolkit';
import type { SessionState } from '../../interfaces';
import type { Authorization, RPCConnectResult, SessionAuthStatus } from '../../../utils/interfaces';
import type { DeepReadonly } from '../../../types';
export declare const initialSessionState: DeepReadonly<SessionState>;
export declare const sessionActions: import("../../toolkit/createSlice").CaseReducerActions<{
    connected: (state: {
        readonly protocol: string;
        readonly iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        readonly authStatus: SessionAuthStatus;
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
            readonly media_allowed?: import("../../../utils/interfaces").MediaAllowed | undefined;
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
    }, { payload }: PayloadAction<RPCConnectResult>) => {
        authStatus: "authorized";
        authState: Authorization;
        authCount: number;
        protocol: string;
        iceServers: RTCIceServer[];
        authError?: {
            readonly code: number;
            readonly message: string;
        } | undefined;
    };
    authStatus: (state: {
        readonly protocol: string;
        readonly iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        readonly authStatus: SessionAuthStatus;
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
            readonly media_allowed?: import("../../../utils/interfaces").MediaAllowed | undefined;
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
    }, { payload }: PayloadAction<SessionAuthStatus>) => {
        authStatus: SessionAuthStatus;
        protocol: string;
        iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        authState?: {
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
            readonly media_allowed?: import("../../../utils/interfaces").MediaAllowed | undefined;
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
        authError?: {
            readonly code: number;
            readonly message: string;
        } | undefined;
        authCount: number;
    };
    updateAuthState: (state: {
        readonly protocol: string;
        readonly iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        readonly authStatus: SessionAuthStatus;
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
            readonly media_allowed?: import("../../../utils/interfaces").MediaAllowed | undefined;
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
    }, { payload }: PayloadAction<Authorization>) => {
        authState: Authorization;
        protocol: string;
        iceServers?: readonly {
            readonly credential?: string | undefined;
            readonly credentialType?: "password" | undefined;
            readonly urls: string | readonly string[];
            readonly username?: string | undefined;
        }[] | undefined;
        authStatus: SessionAuthStatus;
        authError?: {
            readonly code: number;
            readonly message: string;
        } | undefined;
        authCount: number;
    };
}>, sessionReducer: import("redux").Reducer<{
    readonly authStatus: SessionAuthStatus;
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
        readonly media_allowed?: import("../../../utils/interfaces").MediaAllowed | undefined;
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
}, AnyAction>;
//# sourceMappingURL=sessionSlice.d.ts.map