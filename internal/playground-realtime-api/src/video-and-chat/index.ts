import { Chat, Video, config } from '@signalwire/realtime-api'

config({
  project: process.env.PROJECT as string,
  token: process.env.TOKEN as string,
})

async function run() {
  try {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
    })

    video.on('room.started', (room) => {
      console.log('Room started --->', room.id, room.name)
    })

    video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', `${room}`, room.name)
    })

    const chat = new Chat.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
    })

    chat.on('member.joined', (member) => {
      console.log('member --->', member)
    })

    await chat.subscribe(['lobby'])
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
