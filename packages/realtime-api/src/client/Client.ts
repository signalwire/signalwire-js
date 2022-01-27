/**
 * Note: This file will eventually replace
 * packages/realtime-api/src/Client.ts
 */

import {
  BaseClient as CoreBaseClient,
  ClientContract,
  ClientEvents,
} from '@signalwire/core'

export interface RealtimeClient
  extends ClientContract<RealtimeClient, ClientEvents> {
  /**
   * Connects this client to the SignalWire network.
   *
   * As a general best practice, it is suggested to connect the event listeners
   * *before* connecting the client, so that no events are lost.
   *
   * @returns Upon connection, asynchronously returns an instance of this same
   * object.
   *
   * @example
   * ```typescript
   * const client = await createClient({project, token})
   * client.video.on('room.started', async (roomSession) => { })  // connect events
   * await client.connect()
   * ```
   */
  connect(): Promise<RealtimeClient>

  /**
   * Disconnects this client from the SignalWire network.
   */
  disconnect(): void
}

export class Client extends CoreBaseClient<ClientEvents> {}
