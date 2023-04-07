import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { Video } from '@signalwire/realtime-api'
import { sleep } from '../utils'
import { createNewTabRoomSession } from './videoUtils'

test.describe('Video', () => {
  test('should join the room and listen for events', async ({ browser }) => {
    const videoClient = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const prefix = uuid()
    const roomCount = 3

    const roomSessionCreated = new Map<string, any>()
    const findRoomSessionsByPrefix = async () => {
      const { roomSessions } = await videoClient.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

    videoClient.on('room.started', async (roomSession) => {
      console.log('Room started', roomSession.id)
      roomSessionCreated.set(roomSession.id, roomSession)
    })

    videoClient.on('room.ended', async (roomSession) => {
      console.log('Room ended', roomSession.id)
    })

    const roomSessionsAtStart = await findRoomSessionsByPrefix()

    expect(roomSessionsAtStart).toHaveLength(0)

    let roomSessionPromises: Promise<void>[] = []
    for (let index = 0; index < roomCount; index++) {
      roomSessionPromises.push(
        createNewTabRoomSession({
          browser,
          room_name: `${prefix}-${index}`,
          user_name: `${prefix}-member-${index}`,
        })
      )
    }

    await Promise.all(roomSessionPromises)

    // Leave time to connect all the room sessions
    await sleep(5000)

    const roomSessionsRunning = await findRoomSessionsByPrefix()

    expect(roomSessionsRunning.filter((r) => r.recording)).toHaveLength(
      roomCount
    )
    expect(roomSessionsRunning.filter((r) => r.play)).toHaveLength(roomCount)

    for (let index = 0; index < roomSessionsRunning.length; index++) {
      const rs = roomSessionsRunning[index]
      const { recordings } = await rs.getRecordings()
      await Promise.all(recordings.map((r) => r.stop()))

      const { playbacks } = await rs.getPlaybacks()
      await Promise.all(playbacks.map((p) => p.stop()))
    }

    const roomSessionsAtEnd = await findRoomSessionsByPrefix()
    expect(roomSessionsAtEnd.filter((r) => r.recording)).toHaveLength(0)
    expect(roomSessionCreated.size).toBe(roomCount)
    expect(roomSessionsAtEnd).toHaveLength(roomCount)
  })
})
