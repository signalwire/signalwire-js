import { UserOptions, logger } from '@signalwire/core'
import { createClient } from './createClient'
import type { MakeRoomOptions } from './Client'
import type { Room } from './Room'

export interface CreateRoomObjectOptions extends UserOptions, MakeRoomOptions {}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  aspectRatio: { ideal: 16 / 9 },
}

export const RoomSession = function (roomOptions: CreateRoomObjectOptions) {
  const {
    audio = true,
    video = true,
    iceServers,
    rootElementId,
    applyLocalVideoOverlay = true,
    stopCameraWhileMuted = true,
    stopMicrophoneWhileMuted = true,
    speakerId,
    ...userOptions
  } = roomOptions

  const client = createClient({
    ...userOptions,
  })

  const room = client.rooms.makeRoomObject({
    audio,
    video: video === true ? VIDEO_CONSTRAINTS : video,
    negotiateAudio: true,
    negotiateVideo: true,
    iceServers,
    rootElementId,
    applyLocalVideoOverlay,
    stopCameraWhileMuted,
    stopMicrophoneWhileMuted,
    speakerId,
  })

  // WebRTC connection left the room.
  room.once('destroy', () => {
    client.disconnect()
  })

  const join = async () => {
    try {
      await client.connect()
      await room.join()
    } catch (e) {
      logger.error(e)
    }
    return room
  }

  // TODO: add types
  return new Proxy<Room>(room, {
    get(target: any, prop: any, receiver: any) {
      if (prop === 'join') {
        return join
      }

      // TODO: throw errors if the user tries to access certain properties before we're connected.

      return Reflect.get(target, prop, receiver)
    },
  })
} as unknown as { new (roomOptions: CreateRoomObjectOptions): Room }
