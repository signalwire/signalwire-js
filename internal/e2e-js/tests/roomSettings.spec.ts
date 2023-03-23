import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  CreateOrUpdateRoomOptions,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  roomSettings: Partial<CreateOrUpdateRoomOptions>
  expect(p: any): void
}
test.describe('Room Settings', () => {
  const tests: TestConfig[] = [
    {
      testName: 'should set the initial layout',
      roomName: randomizeRoomName('e2e-layout'),
      roomSettings: {
        layout: '10x10',
      },
      expect: (joinParams) => {
        expect(joinParams.room_session.layout_name).toEqual('10x10')
        expect(joinParams.room.layout_name).toEqual('10x10')
      },
    },
    {
      testName: 'should set auto-record and start recording',
      roomName: randomizeRoomName('e2e-auto-record'),
      roomSettings: {
        record_on_start: true,
      },
      expect: (joinParams) => {
        expect(joinParams.room_session.recording).toEqual(true)
        expect(joinParams.room.recording).toEqual(true)
      },
    },
  ]

  tests.forEach((row) => {
    test.skip(row.testName, async ({ createCustomPage }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomData = await createOrUpdateRoom({
        name: row.roomName,
        ...row.roomSettings,
      })

      await createTestRoomSession(page, {
        vrt: {
          room_name: row.roomName,
          user_name: 'member',
          auto_create_room: false,
          permissions: [],
        },
        initialEvents: [],
      })

      // --------------- Joining the room ---------------
      const joinParams = await expectRoomJoined(page)

      // Run custom expectations for each run
      row.expect(joinParams)

      await deleteRoom(roomData.id)
    })
  })

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
        auto_create_room: false,
        permissions: [],
      },
      initialEvents: [],
    }

    await createOrUpdateRoom({
      name: roomName,
      max_members: 2,
    })

    await createTestRoomSession(pageOne, connectionSettings)
    await createTestRoomSession(pageTwo, connectionSettings)
    await createTestRoomSession(pageThree, connectionSettings)

    await expectRoomJoined(pageOne)
    await expectRoomJoined(pageTwo)

    await expectMCUVisible(pageOne)
    await expectMCUVisible(pageTwo)

    // Expect 3rd member to fail join
    await expect(
      pageThree.evaluate(() => {
        return new Promise<any>(async (resolve, reject) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.once('room.joined', resolve)

          try {
            await roomObj.join()
          } catch (e) {
            console.log('##########', e)
            reject(e)
          }
        })
      })
    ).rejects.toBeTruthy()
  })
})
