import { Video } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    video.on('room.started', async (roomSession) => {
      console.log('Room started', roomSession.id)

      roomSession.on('member.updated', async (member) => {
        console.log(member)
      })
    })

    video.on('room.ended', async (roomSession) => {
      console.log('Room ended', roomSession.id)
    })

    const { roomSessions } = await video.getRoomSessions()

    await new Promise((r) => setTimeout(r, 2000))

    if (Array.isArray(roomSessions)) {
      return resolve(0)
    }

    return reject(4)
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
