/**
 * You can use the realtime SDK to listen for and react to events from
 * SignalWire's RealTime APIs.
 *
 * To get started, create a realtime client with {@link createClient} and listen
 * for events. For example:
 *
 * ```typescript
 * import { createClient } from '@signalwire/realtime-api'
 *
 * const client = await createClient({
 *   project: '<project-id>',
 *   token: '<project-token>'
 * })
 *
 * client.video.on('room.started', async (roomSession) => {
 *   console.log("Room started")
 *
 *   roomSession.on('member.joined', async (member) => {
 *     await member.videoMute()
 *   })
 *
 *   await roomSession.subscribe()
 * }
 *
 * await client.connect()
 * ```
 *
 * @module
 */

export * from './createClient'
export * as Video from './video/Video'
