import { Authorization, JSONRPCRequest, JSONRPCResponse, SATAuthorization } from '..';
export { setLogger, getLogger, setDebugOptions } from './logger';
export { isWebrtcEventType, WEBRTC_EVENT_TYPES } from './common';
export { v4 as uuid } from 'uuid';
export * from './parseRPCResponse';
export * from './toExternalJSON';
export * from './toInternalEventName';
export * from './toInternalAction';
export * from './toSnakeCaseKeys';
export * from './extendComponent';
export * from './eventTransformUtils';
export * from './proxyUtils';
export * from './debounce';
export * from './CloseEvent';
export declare const mutateStorageKey: (key: string) => string;
export declare const safeParseJson: <T>(value: T) => Object | T;
export declare const checkWebSocketHost: (host: string) => string;
export declare const timeoutPromise: <T = unknown>(promise: Promise<T>, time: number, exception: any) => Promise<Awaited<T>>;
/** @internal */
export declare const isGlobalEvent: (event: string) => boolean;
/** @internal */
export declare const isInternalGlobalEvent: (event: string) => boolean;
export declare const isSyntheticEvent: (event: string) => boolean;
export declare const isSessionEvent: (event: string) => boolean;
export declare const getGlobalEvents: (kind?: 'all' | 'video') => readonly ["room.started", "room.ended"] | ("room.started" | "room.ended")[];
/**
 * Check and filter the events the user attached returning only the valid ones
 * for the server.
 * IE: `member.updated.audioMuted` means `member.updated` for the server.
 * @internal
 */
export declare const validateEventsToSubscribe: <T = string>(events: T[]) => T[];
/**
 * "Local" events are events controlled by the SDK and the
 * server has no knowledge about them.
 */
export declare const isLocalEvent: (event: string) => boolean;
export declare const toLocalEvent: <T extends string>(event: string) => T;
export declare const toSyntheticEvent: <T extends string>(event: string) => T;
export declare const isJSONRPCRequest: (e: JSONRPCRequest | JSONRPCResponse) => e is JSONRPCRequest;
export declare const isJSONRPCResponse: (e: JSONRPCRequest | JSONRPCResponse) => e is JSONRPCResponse;
export declare const isSATAuth: (e?: Authorization) => e is SATAuthorization;
//# sourceMappingURL=index.d.ts.map