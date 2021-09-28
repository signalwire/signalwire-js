import { UserOptions, logger } from '@signalwire/core'
import { createClient } from './createClient'
import type { MakeRoomOptions } from './Client'
import type { Room } from './Room'

export interface CreateRoomObjectOptions extends UserOptions, MakeRoomOptions {}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  aspectRatio: { ideal: 16 / 9 },
}

/**
 * List of properties/methods the user won't be able to use
 * before they sucessfully call `roomSession.join()`.
 */
const UNSAFE_PROP_ACCESS = [
  'active',
  'audioMute',
  'audioUnmute',
  'deaf',
  'getLayouts',
  'getMembers',
  'getRecordings',
  'hideVideoMuted',
  'join',
  'leave',
  'memberId',
  'removerMember',
  'restoreOutboundAudio',
  'restoreOutboundVideo',
  'setInputSensitivity',
  'setInputVolume',
  'setLayout',
  'setOutputVolume',
  'showVideoMuted',
  'startRecording',
  'stopOutboundAudio',
  'stopOutboundVideo',
  'undeaf',
  'videoMute',
  'videoUnmute',
  'setMicrophoneVolume',
  'setSpeakerVolume',
]

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

  return new Proxy<Room>(room, {
    get(target: Room, prop: any, receiver: any) {
      if (prop === 'join') {
        return join
      }

      if (!target.active && UNSAFE_PROP_ACCESS.includes(prop)) {
        throw new Error(
          `Tried to access the property/method "${prop}" before the room was connected. Please call roomSession.join() first.`
        )
      }

      return Reflect.get(target, prop, receiver)
    },
  })
} as unknown as { new (roomOptions: CreateRoomObjectOptions): Room }
