/**
 * You can use the realtime SDK to listen for and react to events from
 * SignalWire's RealTime APIs.
 *
 * To get started, create a realtime client with {@link createClient} and listen
 * for events. For example:
 *
 * ```javascript
 * const { createClient } = require('@signalwire/realtime-api')
 *
 * createClient({
 *   project: '<project-id>',
 *   token: '<project-token>'
 * }).then((client) => {
 *   client.video.on('room.started', async (roomSession) => {
 *     console.log("Room started")
 *
 *     roomSession.on('member.joined', async (member) => {
 *       console.log(member)
 *     })
 *
 *     await roomSession.subscribe()
 *   });
 *
 *   client.connect()
 * });
 * ```
 *
 * @module
 */

export * from './createClient'

/**
 * You can use the Video namespace to subscribe to video-related events.
 * 
 * See {@link Video.Video} for examples.
 */
export * as Video from './video/Video'
export { setLogger } from '@signalwire/core'
