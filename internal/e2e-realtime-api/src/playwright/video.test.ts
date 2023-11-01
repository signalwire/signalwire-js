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

    const videoClient = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const prefix = uuid()
    const roomName = `${prefix}-hand-raise-priority-e2e`

    const roomSessionCreated = new Map<string, any>()

    const fetchRoomSession = async () => {
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

    const roomSessionsBeforeStart = await fetchRoomSession()
    expect(roomSessionsBeforeStart).toHaveLength(0)

    await createRoomSession({
      page,
      room_name: roomName,
      user_name: `${prefix}-member`,
    })

    const roomSessionsAfterStart = await fetchRoomSession()
    expect(roomSessionsAfterStart).toHaveLength(1)

    const roomSessionNode1 = roomSessionsAfterStart[0]

    const roomSessionWeb = await page.evaluate(() => {
      // @ts-expect-error
      const roomSession = window._roomSession

      return roomSession.room_session
    })

    expect(roomSessionNode1.prioritizeHandraise).toBe(false)
    expect(roomSessionWeb.prioritize_handraise).toBe(false)

    await roomSessionNode1.setPrioritizeHandraise(true)

    // TODO: Find a way to test;
    // when Node SDK update the prioritization,
    // the Web SDK receive the room.updated event with updated `prioritize_handraise` field

    const roomSessionNode2 = (await fetchRoomSession())[0]
    expect(roomSessionNode2.prioritizeHandraise).toBe(true)
  })
})
