import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  createOrUpdateRoom,
} from '../utils'

test.describe('RoomSessionMaxMembers', () => {

test('Should fail to join when max_member is reached', async ({
    createCustomPage,
  }) => {

    const roomName = 'another'

    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })
    const pageThree = await createCustomPage({ name: '[pageThree]' })


    await Promise.all([
      pageOne.goto(SERVER_URL),
      pageTwo.goto(SERVER_URL),
      pageThree.goto(SERVER_URL),
    ])

    const connectionSettings = {
      vrt: {
          room_name: roomName,
          user_name: 'member',
          auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }


    await createOrUpdateRoom({
        name: roomName,
        max_members: 2
      })

    await Promise.all([
      createTestRoomSession(pageOne, connectionSettings),
      createTestRoomSession(pageTwo, connectionSettings),
      createTestRoomSession(pageThree, connectionSettings),
    ])


    await Promise.all([
      expectRoomJoined(pageOne),
      expectRoomJoined(pageTwo)
    ])
    
    await Promise.all([
      expectMCUVisible(pageOne),
      expectMCUVisible(pageTwo)
    ])

    // setting up am expected rejection for the 3rd member
    const joinRoom = pageThree.evaluate(() => {
    return new Promise<any>(async (resolve, reject) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      roomObj.once('room.joined', resolve)

      try {
        await roomObj.join()
      } catch (e) {
        reject(e)
      }
    })
  })

  await expect(joinRoom).rejects.toBeTruthy()

  });

})