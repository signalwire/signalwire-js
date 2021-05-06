import { createRestClient } from '@signalwire/node'

try {
  const client = createRestClient({
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
  if (error.name === 'AuthError') {
    console.error(error)
  } else if (error.response) {
    console.error(error.response)
  }
}
