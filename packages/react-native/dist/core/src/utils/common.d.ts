import { WebRTCEventType } from '..';
/**
 * Converts values from camelCase to snake_case
 * @internal
 */
export declare const fromCamelToSnakeCase: <T>(event: T) => T;
export declare const WEBRTC_EVENT_TYPES: WebRTCEventType[];
export declare const isWebrtcEventType: (eventType: string) => eventType is "webrtc.message";
//# sourceMappingURL=common.d.ts.map