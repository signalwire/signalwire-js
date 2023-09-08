import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { Video } from '@signalwire/realtime-api'
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
      if (roomSession.name.startsWith(prefix)) {
        roomSessionCreated.set(roomSession.id, roomSession)
      }
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

    const roomSessionsRunning = await findRoomSessionsByPrefix()
    expect(roomSessionsRunning).toHaveLength(roomCount)

    expect(roomSessionsRunning.filter((r) => r.recording)).toHaveLength(
      roomCount
    )
    expect(roomSessionsRunning.filter((r) => r.play)).toHaveLength(roomCount)

    let waitForRecordEndResolve: (value: void) => void
    const waitForRecordEnd = new Promise((resolve) => {
      waitForRecordEndResolve = resolve
    })
    let waitForPlaybackEndResolve: (value: void) => void
    const waitForPlaybackEnd = new Promise((resolve) => {
      waitForPlaybackEndResolve = resolve
    })

    for (let index = 0; index < roomSessionsRunning.length; index++) {
      const rs = roomSessionsRunning[index]
      const { recordings } = await rs.getRecordings()

      rs.on('recording.ended', () => {
        console.log('Recording has ended')
        waitForRecordEndResolve()
      })
      await Promise.all(recordings.map((r) => r.stop()))
      await waitForRecordEnd

      rs.on('playback.ended', () => {
        console.log('Playback has ended')
        waitForPlaybackEndResolve()
      })
      const { playbacks } = await rs.getPlaybacks()
      await Promise.all(playbacks.map((p) => p.stop()))
      await waitForPlaybackEnd
    }

    const roomSessionsAtEnd = await findRoomSessionsByPrefix()
    expect(roomSessionsAtEnd.filter((r) => r.recording)).toHaveLength(0)
    expect(roomSessionCreated.size).toBe(roomCount)
    expect(roomSessionsAtEnd).toHaveLength(roomCount)
  })
})
