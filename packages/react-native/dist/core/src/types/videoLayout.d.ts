import type { SwEvent } from '.';
import { VideoPosition } from '..';
import type { CamelToSnakeCase, ToInternalVideoEvent } from './utils';
export declare type LayoutChanged = 'layout.changed';
/**
 * List of public event names
 */
export declare type VideoLayoutEventNames = LayoutChanged;
/**
 * List of internal events
 * @internal
 */
export declare type InternalVideoLayoutEventNames = ToInternalVideoEvent<VideoLayoutEventNames>;
/**
 * Base Interface for a VideoLayout entity
 */
export interface VideoLayout {
    name: string;
    roomSessionId: string;
    roomId: string;
    layers: VideoLayoutLayer[];
}
export interface VideoLayoutLayer {
    memberId?: string;
    y: number;
    x: number;
    height: number;
    width: number;
    layerIndex: number;
    zIndex: number;
    reservation: string;
    position: VideoPosition;
    playingFile: boolean;
    visible: boolean;
}
/**
 * VideoLayout entity for internal usage (converted to snake_case)
 * @internal
 */
export declare type InternalVideoLayoutLayer = {
    [K in keyof VideoLayoutLayer as CamelToSnakeCase<K>]: VideoLayoutLayer[K];
};
export declare type InternalVideoLayout = {
    [K in Exclude<keyof VideoLayout, 'layers'> as CamelToSnakeCase<K>]: VideoLayout[K];
} & {
    layers: InternalVideoLayoutLayer[];
};
/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */
/**
 * 'video.layout.changed
 */
export interface VideoLayoutChangedEventParams {
    room_session_id: string;
    room_id: string;
    layout: InternalVideoLayout;
}
export interface VideoLayoutChangedEvent extends SwEvent {
    event_type: ToInternalVideoEvent<LayoutChanged>;
    params: VideoLayoutChangedEventParams;
}
export declare type VideoLayoutEvent = VideoLayoutChangedEvent;
export declare type VideoLayoutEventParams = VideoLayoutChangedEventParams;
//# sourceMappingURL=videoLayout.d.ts.map