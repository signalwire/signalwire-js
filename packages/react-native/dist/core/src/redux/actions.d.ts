import { createAction, Action } from './toolkit';
import type { JSONRPCRequest, SessionAuthError } from '../utils/interfaces';
import { EventEmitter } from '..';
export declare const initAction: import("./toolkit").ActionCreatorWithoutPayload<"swSdk/init">;
export declare const destroyAction: import("./toolkit").ActionCreatorWithoutPayload<"swSdk/destroy">;
/**
 * Used to trigger a `signalwire.reauthenticate`
 */
export declare const reauthAction: import("./toolkit").ActionCreatorWithPayload<{
    token: string;
}, string>;
export declare const authErrorAction: import("./toolkit").ActionCreatorWithPayload<{
    error: SessionAuthError;
}, string>;
export declare const authSuccessAction: import("./toolkit").ActionCreatorWithoutPayload<"auth/success">;
export declare const authExpiringAction: import("./toolkit").ActionCreatorWithoutPayload<"auth/expiring">;
export declare const socketMessageAction: import("./toolkit").ActionCreatorWithPayload<JSONRPCRequest, string>;
export declare const sessionConnectedAction: import("./toolkit").ActionCreatorWithoutPayload<"session.unknown" | "session.idle" | "session.reconnecting" | "session.connected" | "session.disconnected" | "session.auth_error" | "session.expiring">;
export declare const sessionDisconnectedAction: import("./toolkit").ActionCreatorWithoutPayload<"session.unknown" | "session.idle" | "session.reconnecting" | "session.connected" | "session.disconnected" | "session.auth_error" | "session.expiring">;
export declare const sessionReconnectingAction: import("./toolkit").ActionCreatorWithoutPayload<"session.unknown" | "session.idle" | "session.reconnecting" | "session.connected" | "session.disconnected" | "session.auth_error" | "session.expiring">;
export declare const sessionAuthErrorAction: import("./toolkit").ActionCreatorWithPayload<Error, "session.unknown" | "session.idle" | "session.reconnecting" | "session.connected" | "session.disconnected" | "session.auth_error" | "session.expiring">;
export declare const sessionExpiringAction: import("./toolkit").ActionCreatorWithoutPayload<"session.unknown" | "session.idle" | "session.reconnecting" | "session.connected" | "session.disconnected" | "session.auth_error" | "session.expiring">;
export declare const sessionForceCloseAction: import("./toolkit").ActionCreatorWithoutPayload<"session.forceClose">;
export declare const makeCustomSagaAction: (id: string, action: Action) => {
    type: string;
};
export declare const getCustomSagaActionType: (id: string, action: Action) => string;
export declare const compoundEventAttachAction: import("./toolkit").ActionCreatorWithPayload<{
    compoundEvents: EventEmitter.EventNames<EventEmitter.ValidEventTypes>[];
    event: EventEmitter.EventNames<EventEmitter.ValidEventTypes>;
    namespace?: string | undefined;
}, "compound_event:attach">;
export { createAction };
//# sourceMappingURL=actions.d.ts.map