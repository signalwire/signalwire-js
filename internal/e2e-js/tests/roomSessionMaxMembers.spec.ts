import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  createOrUpdateRoom,
  randomizeRoomName
} from '../utils'

test.describe('Room Session Max Members', () => {

test('Should fail to join when max_member is reached', async ({
    createCustomPage,
  }) => {

    

    const allPages = await Promise.all([
      createCustomPage({ name: '[pageOne]' }),
      createCustomPage({ name: '[pageTwo]' }),
      createCustomPage({ name: '[pageThree]' })
    ])
    
    const [pageOne ,pageTwo, pageThree] = allPages;  
    
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))
    
    const roomName = randomizeRoomName()

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

    await Promise.all(
      allPages.map((page, i) => createTestRoomSession(page, {
        vrt: {
          room_name: roomName,
          user_name: `member_${i+i}`,
          auto_create_room: true,
          permissions: ['room.stream'],
        },
        initialEvents: ['stream.started', 'stream.ended'],
      }))
    )  

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