import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { Video } from '@signalwire/realtime-api'
import {
  createRoomAndRecordPlay,
  createRoomSession,
  enablePageLogs,
} from './videoUtils'
import { SERVER_URL } from '../../utils'

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
        createRoomAndRecordPlay({
          browser,
          pageName: `[page-${index}]`,
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
    expect(
      roomSessionsRunning.filter((r) => {
        return (
          typeof r.play === 'function' &&
          typeof r.lock === 'function' &&
          typeof r.unlock === 'function'
        )
      })
    ).toHaveLength(roomCount)

    const noop = () => {}

    for (let index = 0; index < roomSessionsRunning.length; index++) {
      const rs = roomSessionsRunning[index]

      await new Promise((resolve) => {
        rs.on('recording.ended', noop)
        rs.on('playback.ended', noop)
        rs.on('room.updated', noop)
        rs.on('room.subscribed', resolve)
      })

      await new Promise<void>(async (resolve) => {
        rs.on('recording.ended', () => {
          resolve()
        })
        const { recordings } = await rs.getRecordings()
        await Promise.all(recordings.map((r) => r.stop()))
      })

      await new Promise<void>(async (resolve) => {
        rs.on('playback.ended', () => {
          resolve()
        })
        const { playbacks } = await rs.getPlaybacks()
        await Promise.all(playbacks.map((p) => p.stop()))
      })

      await new Promise<void>(async (resolve, reject) => {
        rs.on('room.updated', (roomSession) => {
          if (roomSession.locked === true) {
            resolve()
          } else {
            reject(new Error('Not locked'))
          }
        })
        await rs.lock()
      })

      await new Promise<void>(async (resolve, reject) => {
        rs.on('room.updated', (roomSession) => {
          if (roomSession.locked === false) {
            resolve()
          } else {
            reject(new Error('Still locked'))
          }
        })
        await rs.unlock()
      })
    }

    const roomSessionsAtEnd = await findRoomSessionsByPrefix()
    expect(roomSessionsAtEnd.filter((r) => r.recording)).toHaveLength(0)
    expect(roomSessionCreated.size).toBe(roomCount)
    expect(roomSessionsAtEnd).toHaveLength(roomCount)
  })

  test('should join the room and set hand raise priority', async ({
    browser,
  }) => {
    const page = await browser.newPage()
    await page.goto(SERVER_URL)
    enablePageLogs(page, '[pageOne]')

    // Create a realtime-api Video client
    const videoClient = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const prefix = uuid()
    const roomName = `${prefix}-hand-raise-priority-e2e`

    const findRoomSession = async () => {
      const { roomSessions } = await videoClient.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

    // Listen for realtime-api event
    videoClient.on('room.started', (room) => {
      room.on('room.updated', (room) => {
        console.log('>> room.updated', room.name)
      })
    })

    const roomSessionsBeforeStart = await findRoomSession()
    expect(roomSessionsBeforeStart).toHaveLength(0)

    // Create and join room on the web using JS SDK
    await createRoomSession({
      page,
      room_name: roomName,
      user_name: `${prefix}-member`,
      initialEvents: ['room.updated'],
    })

    const roomSessionsAfterStart = await findRoomSession()
    expect(roomSessionsAfterStart).toHaveLength(1)

    const roomSessionNode = roomSessionsAfterStart[0]

    const roomSessionWeb = await page.evaluate(() => {
      // @ts-expect-error
      const roomSession = window._roomOnJoined

      return roomSession.room_session
    })

    expect(roomSessionNode.prioritizeHandraise).toBe(false)
    expect(roomSessionWeb.prioritize_handraise).toBe(false)

    const roomSessionWebUpdated = page.evaluate(() => {
      return new Promise<any>((resolve, _reject) => {
        // @ts-expect-error
        const roomSessionWeb = window._roomObj

        roomSessionWeb.on('room.updated', (room) => {
          console.log('>> room.updated web', room)
          resolve(room.room_session)
        })
      })
    })

    const roomSessionNodeUpdated = await new Promise<Video.RoomSession>(
      async (resolve, _reject) => {
        roomSessionNode.on('room.updated', (room) => {
          resolve(room)
        })
        await roomSessionNode.setPrioritizeHandraise(true)
      }
    )

    expect(roomSessionNodeUpdated.prioritizeHandraise).toBe(true)
    expect((await roomSessionWebUpdated).prioritize_handraise).toBe(true)
  })
})
