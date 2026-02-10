import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { SignalWire, Video } from '@signalwire/realtime-api'
import {
  type CreateRoomAndRecordPlayReturn,
  createRoomAndRecordPlay,
  createRoomSession,
  enablePageLogs,
  leaveRoom,
} from './videoUtils'
import { SERVER_URL } from '../../utils'

test.describe('Video', () => {
  test('should join the room and listen for events', async ({ browser }) => {
    console.log('===START===', 'should join the room and listen for events')

    const prefix = uuid()
    const roomCount = 3
    const roomSessionCreated = new Map<string, any>()

    const findRoomSessionsByPrefix = async () => {
      const { roomSessions } = await client.video.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

    const client =
      await test.step('[Realtime-API] should create a client', async () => {
        return await SignalWire({
          host: process.env.RELAY_HOST,
          project: process.env.RELAY_PROJECT as string,
          token: process.env.RELAY_TOKEN as string,
          debug: { logWsTraffic: true },
        })
      })

    const roomSessionStartedNode =
      test.step('[Realtime-API] should expect 3 "room.started" event', () => {
        return new Promise<void>(async (resolve, _reject) => {
          let count = 0
          await client.video.listen({
            onRoomStarted: (roomSession) => {
              console.log('>> onRoomStarted', roomSession.name, prefix)
              if (roomSession.name.startsWith(prefix)) {
                count++
                roomSessionCreated.set(roomSession.id, roomSession)
                console.log('roomSessionCreated count', count)
                if (count === roomCount) {
                  resolve()
                }
              }
            },
          })
        })
      })

    await test.step('[Realtime-API] should expect 0 room sessions initially', async () => {
      const roomSessionsAtStart = await findRoomSessionsByPrefix()
      expect(roomSessionsAtStart).toHaveLength(0)
    })

    const roomSessionsWeb: CreateRoomAndRecordPlayReturn[] = []

    // Join room from page 1
    await test.step('[Browser-SDK-1] should join a room and start playback/recording', async () => {
      const pageOneRoomSession = await createRoomAndRecordPlay({
        browser,
        pageName: '[page-1]',
        room_name: `${prefix}-1`,
        user_name: `${prefix}-member-1`,
      })
      roomSessionsWeb.push(pageOneRoomSession!)
    })

    // Join room from page 2
    await test.step('[Browser-SDK-2] should join a room and start playback/recording', async () => {
      const pageTwoRoomSession = await createRoomAndRecordPlay({
        browser,
        pageName: '[page-2]',
        room_name: `${prefix}-2`,
        user_name: `${prefix}-member-2`,
      })
      roomSessionsWeb.push(pageTwoRoomSession!)
    })

    // Join room from page 3
    await test.step('[Browser-SDK-3] should join a room and start playback/recording', async () => {
      const pageThreeRoomSession = await createRoomAndRecordPlay({
        browser,
        pageName: '[page-3]',
        room_name: `${prefix}-3`,
        user_name: `${prefix}-member-3`,
      })
      roomSessionsWeb.push(pageThreeRoomSession!)
    })

    // Wait till Node SDK receive room.started events {roomCount} times
    await test.step('[Realtime-API] should wait for 3 "room.started" events', async () => {
      await roomSessionStartedNode
      expect(roomSessionCreated.size).toBe(roomCount)
    })

    const roomSessionsRunning =
      await test.step('[Realtime-API] should expect 3 room sessions', async () => {
        const roomSessionsRunning = await findRoomSessionsByPrefix()
        expect(roomSessionsRunning).toHaveLength(roomCount)
        return roomSessionsRunning
      })

    await test.step('[Realtime-API] should expect all 3 rooms running a recording', () => {
      expect(roomSessionsRunning.filter((r) => r.recording)).toHaveLength(
        roomCount
      )
    })

    await test.step('[Realtime-API] should expect all 3 rooms to have play function', () => {
      expect(
        roomSessionsRunning.filter((r) => typeof r.play === 'function')
      ).toHaveLength(roomCount)
    })

    await test.step('[Realtime-API] should stop the recording and expect "recording.ended" event for all 3 rooms', async () => {
      for (let index = 0; index < roomSessionsRunning.length; index++) {
        const rs = roomSessionsRunning[index]
        await new Promise<void>(async (resolve) => {
          await rs.listen({
            onRecordingEnded: () => resolve(),
          })
          const { recordings } = await rs.getRecordings()
          await Promise.all(recordings.map((r) => r.stop()))
        })
      }
    })

    await test.step('[Realtime-API] should stop the playback and expect "playback.ended" event for all 3 rooms', async () => {
      for (let index = 0; index < roomSessionsRunning.length; index++) {
        const rs = roomSessionsRunning[index]
        await new Promise<void>(async (resolve) => {
          await rs.listen({
            onPlaybackEnded: () => resolve(),
          })
          const { playbacks } = await rs.getPlaybacks()
          await Promise.all(playbacks.map((p) => p.stop()))
        })
      }
    })

    await test.step('[Realtime-API] should lock all 3 rooms and expect "room.updated" event', async () => {
      for (let index = 0; index < roomSessionsRunning.length; index++) {
        const rs = roomSessionsRunning[index]
        await new Promise<void>(async (resolve, reject) => {
          const unsub = await rs.listen({
            onRoomUpdated: async (roomSession) => {
              if (roomSession.locked === true) {
                resolve()
                await unsub()
              } else {
                reject(new Error('Room is not locked!'))
              }
            },
          })
          await rs.lock()
        })
      }
    })

    await test.step('[Realtime-API] should unlock all 3 rooms and expect "room.updated" event', async () => {
      for (let index = 0; index < roomSessionsRunning.length; index++) {
        const rs = roomSessionsRunning[index]
        await new Promise<void>(async (resolve, reject) => {
          const unsub = await rs.listen({
            onRoomUpdated: async (roomSession) => {
              if (roomSession.locked === false) {
                resolve()
                await unsub()
              } else {
                reject(new Error('Room is not unlocked!'))
              }
            },
          })
          await rs.unlock()
        })
      }
    })

    await test.step('[Realtime-API] should leave all 3 rooms', async () => {
      for (let index = 0; index < roomSessionsWeb.length; index++) {
        const rs = roomSessionsWeb[index]
        await rs?.leaveRoom()
      }
    })

    await test.step('[Realtime-API] should disconnect the client', async () => {
      await client.disconnect()
    })

    console.log('===END===', 'should join the room and listen for events')
  })

  test('should join the room and set hand raise priority', async ({
    browser,
  }) => {
    console.log(
      '===START===',
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

    // Room length should be 0 before start
    const roomSessionsBeforeStart = await findRoomSession()
    expect(roomSessionsBeforeStart).toHaveLength(0)

    // Create and join room on the web using JS SDK
    await createRoomSession({
      page,
      room_name: roomName,
      user_name: `${prefix}-member`,
      initialEvents: ['room.updated', 'room.left'],
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

    // Leave the room
    await leaveRoom({ page })

    // Disconnect the client
    await client.disconnect()

    console.log('===END===', 'should join the room and set hand raise priority')
  })

  test('should lock/unlock video room', async ({ browser }) => {
    console.log('===START===', 'should lock/unlock video room')

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
    const roomName = `${prefix}-lock-unlock-e2e`

    const findRoomSession = async () => {
      const { roomSessions } = await client.video.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }

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

    // Expect room to be NOT locked
    expect(roomSessionNode.locked).toBe(false)
    expect(roomSessionWeb.locked).toBe(false)

    // Lock the room using the Node SDK
    await new Promise<void>(async (res, _rej) => {
      const unsub = await roomSessionNode.listen({
        onRoomUpdated: async (rs) => {
          if (rs.locked === true) {
            res()
            await unsub()
          }
        },
      })
      await roomSessionNode.lock()
    })

    // Unlock the room using the Web SDK
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomSession = window._roomObj as JSVideo.RoomSession

      await new Promise<void>(async (res, _rej) => {
        roomSession.on('room.updated', (rs) => {
          if (rs.room_session.locked === false) {
            res()
          }
        })
        await roomSession.unlock()
      })
    })

    // Leave the room
    await leaveRoom({ page })

    // Disconnect the client
    await client.disconnect()

    console.log('===END===', 'should lock/unlock video room')
  })
})
