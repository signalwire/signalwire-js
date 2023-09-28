import { test, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { SignalWire } from '@signalwire/realtime-api'
import { createNewTabRoomSession } from './videoUtils'

test.describe('Video', () => {
  test('should join the room and listen for events', async ({ browser }) => {
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
        createNewTabRoomSession({
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
          typeof r.play === 'function' // &&
          // typeof r.lock === 'function' &&
          // typeof r.unlock === 'function'
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

      // await new Promise<void>(async (resolve, reject) => {
      //   rs.on('room.updated', (roomSession) => {
      //     if (roomSession.locked === true) {
      //       resolve()
      //     } else {
      //       reject(new Error('Not locked'))
      //     }
      //   })
      //   await rs.lock()
      // })

      // await new Promise<void>(async (resolve, reject) => {
      //   rs.on('room.updated', (roomSession) => {
      //     if (roomSession.locked === false) {
      //       resolve()
      //     } else {
      //       reject(new Error('Still locked'))
      //     }
      //   })
      //   await rs.unlock()
      // })
    }

    const roomSessionsAtEnd = await findRoomSessionsByPrefix()
    expect(roomSessionsAtEnd.filter((r) => r.recording)).toHaveLength(0)
    expect(roomSessionCreated.size).toBe(roomCount)
    expect(roomSessionsAtEnd).toHaveLength(roomCount)
  })
})
