import { onRoomSessionReady } from '../store'

const root = document.getElementById('vanilla-root')

onRoomSessionReady().then((room) => {
  console.log('Vanilla > onRoomSessionReady', room)

  room.on('memberList.updated', (data) => {
    console.log('Vanilla > memberList.updated ---->', data)
  })
})
