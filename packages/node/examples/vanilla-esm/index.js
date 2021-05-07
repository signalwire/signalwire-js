import { createRestClient } from '@signalwire/node'

try {
  const client = createRestClient({
    projectId: '<project-id>',
    projectToken: '<project-token>',
  })

  const roomName = 'lobby'

  let room = await client.getRoomByName({
    name: roomName,
  })

  if (!room) {
    room = await client.createRoom({
      name: roomName,
    })
  }

  const vrt = await client.createVRT({
    roomName: roomName,
    userName: 'Some User',
  })

  setTimeout(async () => {
    await client.deleteRoom({ id: room.id })

    console.log('room deleted')
  }, 2000)

  console.log('VRT', vrt)
} catch (error) {
  if (error.name === 'AuthError') {
    console.error(error)
  } else if (error.response) {
    console.error(error.response)
  } else {
    console.error('Error', error)
  }
}
