import { BaseComponent } from '../BaseComponent';
import { BaseComponentOptions } from '../utils/interfaces';
import { OnlyFunctionProperties } from '../types';
import type { VideoStreamContract, VideoStreamEventNames } from '../types/videoStream';
/**
 * Represents a specific Stream of a room session.
 */
export interface RoomSessionStream extends VideoStreamContract {
}
export declare type RoomSessionStreamEventsHandlerMapping = Record<VideoStreamEventNames, (stream: RoomSessionStream) => void>;
export declare class RoomSessionStreamAPI extends BaseComponent<RoomSessionStreamEventsHandlerMapping> implements OnlyFunctionProperties<RoomSessionStream> {
    stop(): Promise<void>;
}
export declare const createRoomSessionStreamObject: (params: BaseComponentOptions<RoomSessionStreamEventsHandlerMapping>) => RoomSessionStream;
//# sourceMappingURL=RoomSessionStream.d.ts.map