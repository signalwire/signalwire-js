import { Video } from '@signalwire/realtime-api'
import { createTestRunner, sleep } from './utils'
import { createRoomSession } from './videoUtils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    const roomSessionCreated = new Set()

    video.on('room.started', async (roomSession) => {
      console.log('Room started', roomSession.id)

      roomSessionCreated.add(roomSession)

      // roomSession.on('member.updated', async (member) => {
      //   console.log(member)
      // })
    })

    video.on('room.ended', async (roomSession) => {
      console.log('Room ended', roomSession.id)
    })

    const { roomSessions } = await video.getRoomSessions()

    if (roomSessions.length > 0) {
      return reject(4)
    }
    const roomSessionPromises = Array(3).map((_, index) => {
      return createRoomSession({
        roomName: `e2e-rt-api-${index}`,
        userName: `e2e-rt-api-member-${index}`,
      })
    })

    await Promise.all(roomSessionPromises)

    await sleep(3000)

    if (roomSessionCreated.size === 3) {
      return resolve(0)
    }

    reject(4)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Video E2E',
    testHandler: handler,
  })

  await runner.run()
}

main()
