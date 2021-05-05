import { createClient } from '@signalwire/node'

try {
  const client = createClient({
    projectId: '<project-id>',
    projectToken: '<project-token>',
  })

  const roomName = 'lobby'

  const existingRoom = await client.getRoomByName({
    name: roomName,
  })

  if (!existingRoom) {
    await client.createRoom({
      name: roomName,
    })
  }

  const vrt = await client.createVRT({
    roomName: roomName,
    userName: 'Some User',
  })

  console.log('VRT', vrt)
} catch (error) {
  console.error('Error', error.response)
}
