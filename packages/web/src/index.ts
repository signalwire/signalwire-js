import 'regenerator-runtime/runtime.js'

import { createRoomObject } from './createRoomObject'
import { createClient } from './createClient'
import { Client } from './Client'
import { joinRoom } from './joinRoom'

const Video = {
  createRoomObject,
  createClient,
  Client,
  joinRoom,
}

export { Video }
export * as WebRTC from '@signalwire/webrtc'
