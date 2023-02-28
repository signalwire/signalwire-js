import tap from 'tap'
import { uuid } from '@signalwire/core'
import { Video } from '@signalwire/realtime-api'
import { Video as JsVideo } from '@signalwire/js'
import { createTestRunner, sleep } from './utils'
import { createRoomSession } from './videoUtils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: { logWsTraffic: true },
    })

    const prefix = uuid()
    const roomCount = 3
    const findRoomSessionsByPrefix = async () => {
      const { roomSessions } = await video.getRoomSessions()
      return roomSessions.filter((r) => r.name.startsWith(prefix))
    }
    const roomSessionCreated = new Map<string, any>()

    video.on('room.started', async (roomSession) => {
      console.log('Room started', roomSession.id)

      roomSessionCreated.set(roomSession.id, roomSession)
    })

    video.on('room.ended', async (roomSession) => {
      console.log('Room ended', roomSession.id)
    })

    const roomSessionsAtStart = await findRoomSessionsByPrefix()
    tap.equal(roomSessionsAtStart.length, 0, 'roomSessionsAtStart is not zero')

    let roomSessionPromises: Promise<JsVideo.RoomSession>[] = []
    for (let index = 0; index < roomCount; index++) {
      roomSessionPromises.push(
        createRoomSession({
          roomName: `${prefix}-${index}`,
          userName: `${prefix}-member-${index}`,
        })
      )
    }

    const jsRoomSessions = await Promise.all(roomSessionPromises)

    // Leave time to connect all the room sessions
    await sleep(5000)

    // Start Recording on all
    await jsRoomSessions[0].startRecording()
    await jsRoomSessions[1].startRecording()
    await jsRoomSessions[2].startRecording()

    const playUrl = process.env.PLAYBACK_URL as string
    await jsRoomSessions[0].play({ url: playUrl })
    await jsRoomSessions[1].play({ url: playUrl })
    await jsRoomSessions[2].play({ url: playUrl })

    const roomSessionsRunning = await findRoomSessionsByPrefix()

    tap.equal(
      roomSessionsRunning.filter((r) => r.recording).length,
      roomCount,
      'Not all rooms are recording'
    )

    for (let index = 0; index < roomSessionsRunning.length; index++) {
      const rs = roomSessionsRunning[index]
      const { recordings } = await rs.getRecordings()
      await Promise.all(recordings.map((r) => r.stop()))

      const { playbacks } = await rs.getPlaybacks()
      await Promise.all(playbacks.map((p) => p.stop()))
    }

    const roomSessionsAtEnd = await findRoomSessionsByPrefix()
    tap.equal(
      roomSessionsAtEnd.filter((r) => r.recording).length,
      0,
      'Some rooms are still recording'
    )
    tap.equal(roomSessionCreated.size, roomCount, `roomSessionCreated is wrong`)
    tap.equal(roomSessionsAtEnd.length, roomCount, 'roomSessionsAtEnd is wrong')

    resolve(0)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Video E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
