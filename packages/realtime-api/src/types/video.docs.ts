import type { RoomSession } from '../video/RoomSession'

export type RealTimeVideoApiEventsDocs = {
    /**
     * A new room session has started.
     */
    "room.started": (room: RoomSession) => void;
    /**
     * A room session has ended.
     */
    "room.ended": (room: RoomSession) => void;
}