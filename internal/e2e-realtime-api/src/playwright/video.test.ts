import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { SignalWire, Video } from '@signalwire/realtime-api'
import {
  createRoomAndRecordPlay,
  createRoomSession,
  enablePageLogs,
} from './videoUtils'
import { SERVER_URL } from '../../utils'

test.describe('Video', () => {
  test('should join the room and listen for events', async ({ browser }) => {
    console.log('===Test===', 'should join the room and listen for events')

    const client = await SignalWire({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const prefix = uuid()
    const roomCount = 3

    const roomSessionCreated = new Map<string, any>()
    const findRoomSessionsByPrefix = async () => {
      const { roomSessions } = await client.video.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

    await client.video.listen({
      onRoomStarted: (roomSession) => {
        console.log('Room started', roomSession.id)
        if (roomSession.name.startsWith(prefix)) {
          roomSessionCreated.set(roomSession.id, roomSession)
        }
      },
      onRoomEnded: (roomSession) => {
        console.log('Room ended', roomSession.id)
      },
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

      await new Promise(async (resolve) => {
        await rs.listen({
          onRecordingEnded: noop,
          onPlaybackEnded: noop,
          onRoomUpdated: noop,
          onRoomSubscribed: resolve,
        })
      })

      await new Promise<void>(async (resolve) => {
        await rs.listen({
          onRecordingEnded: () => resolve(),
        })
        const { recordings } = await rs.getRecordings()
        await Promise.all(recordings.map((r) => r.stop()))
      })

      await new Promise<void>(async (resolve) => {
        await rs.listen({
          onPlaybackEnded: () => resolve(),
        })
        const { playbacks } = await rs.getPlaybacks()
        await Promise.all(playbacks.map((p) => p.stop()))
      })

      await new Promise<void>(async (resolve, reject) => {
        const unsub = await rs.listen({
          onRoomUpdated: async (roomSession) => {
            if (roomSession.locked === true) {
              resolve()
              await unsub()
            } else {
              reject(new Error('Not locked'))
            }
          },
        })
        await rs.lock()
      })

      await new Promise<void>(async (resolve, reject) => {
        const unsub = await rs.listen({
          onRoomUpdated: async (roomSession) => {
            if (roomSession.locked === false) {
              resolve()
              await unsub()
            } else {
              reject(new Error('Not locked'))
            }
          },
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
    console.log(
      '===Test===',
      'should join the room and set hand raise priority'
    )

    const client = await SignalWire({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const page = await browser.newPage()
    await page.goto(SERVER_URL)
    enablePageLogs(page, '[pageOne]')

    const prefix = uuid()
    const roomName = `${prefix}-hand-raise-priority-e2e`

    const findRoomSession = async () => {
      const { roomSessions } = await client.video.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

    // Listen for realtime-api event
    await client.video.listen({
      onRoomStarted: async (roomSession) => {
        console.log('>> room.started', roomSession.name)
        await roomSession.listen({
          onRoomUpdated: (room) => {
            console.log('>> room.updated', room.name)
          },
        })
      },
    })

    // Room length should be 0 before start
    const roomSessionsBeforeStart = await findRoomSession()
    expect(roomSessionsBeforeStart).toHaveLength(0)

    // Create and join room on the web using JS SDK
    await createRoomSession({
      page,
      room_name: roomName,
      user_name: `${prefix}-member`,
      initialEvents: ['room.updated'],
    })

    // Room length should be 1 after start
    const roomSessionsAfterStart = await findRoomSession()
    expect(roomSessionsAfterStart).toHaveLength(1)

    const roomSessionNode = roomSessionsAfterStart[0]

    const roomSessionWeb = await page.evaluate(() => {
      // @ts-expect-error
      const roomSession = window._roomOnJoined

      return roomSession.room_session
    })

    // Hand raise is not prioritize on both Node & Web room session object
    expect(roomSessionNode.prioritizeHandraise).toBe(false)
    expect(roomSessionWeb.prioritize_handraise).toBe(false)

    const roomSessionWebUpdated = page.evaluate(() => {
      return new Promise<any>((resolve, _reject) => {
        // @ts-expect-error
        const roomSessionWeb = window._roomObj

        roomSessionWeb.on('room.updated', (room) => {
          resolve(room.room_session)
        })
      })
    })

    // Set the hand raise prioritization via Node SDK
    const roomSessionNodeUpdated = await new Promise<Video.RoomSession>(
      async (resolve, _reject) => {
        await roomSessionNode.listen({
          onRoomUpdated: (room) => {
            resolve(room)
          },
        })
        await roomSessionNode.setPrioritizeHandraise(true)
      }
    )

    // Expect hand raise prioritization to be true on both Node & Web SDK objects
    expect(roomSessionNodeUpdated.prioritizeHandraise).toBe(true)
    expect((await roomSessionWebUpdated).prioritize_handraise).toBe(true)
  })
})
