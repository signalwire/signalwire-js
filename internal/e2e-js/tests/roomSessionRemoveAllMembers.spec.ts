import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectPageReceiveAudio,
  randomizeRoomName,
  expectRoomJoinWithDefaults,
} from '../utils'

test.describe('RoomSession removeAllMembers method', () => {
  test('should remove all members from a room', async ({
    createCustomPage,
  }) => {
    const allPages = await Promise.all([
      createCustomPage({ name: '[page1]' }),
      createCustomPage({ name: '[page2]' }),
      createCustomPage({ name: '[page3]' }),
    ])
    const [pageOne, pageTwo, pageThree] = allPages
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))

    const room_name = randomizeRoomName()

    await Promise.all(
      allPages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name,
            user_name: `e2e_removeall_${i + 1}`,
            permissions: i === 0 ? ['room.member.remove'] : [],
          },
          initialEvents: [
            'member.joined',
            'member.updated',
            'member.left',
            'layout.changed',
          ],
        })
      })
    )

    await test.step('join room from pageOne', async () => {
      await expectRoomJoinWithDefaults(pageOne)

      await test.step('MCU is visible on pageOne', async () => {
        await expectMCUVisible(pageOne)
      })

      await test.step('pageOne is receiving audio', async () => {
        await expectPageReceiveAudio(pageOne)
      })
    })

    await test.step('join room from pageTwo', async () => {
      await expectRoomJoinWithDefaults(pageTwo)

      await test.step('MCU is visible on pageTwo', async () => {
        await expectMCUVisible(pageTwo)
      })

      await test.step('pageTwo is receiving audio', async () => {
        await expectPageReceiveAudio(pageTwo)
      })
    })

    await test.step('join room from pageThree', async () => {
      await expectRoomJoinWithDefaults(pageThree)

      await test.step('MCU is visible on pageThree', async () => {
        await expectMCUVisible(pageThree)
      })

      await test.step('pageThree is receiving audio', async () => {
        await expectPageReceiveAudio(pageThree)
      })
    })

    const promiseWaitForMember2Left =
      test.step('wait for member 2 left', () => {
        return pageTwo.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    const promiseWaitForMember3Left =
      test.step('wait for member 3 left', () => {
        return pageThree.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    const promiseWaitForMember1Left =
      test.step('wait for member 1 left', () => {
        return pageOne.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    await test.step('remove all members from pageOne', async () => {
      await pageOne.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.removeAllMembers()
      })
    })

    await Promise.all([
      promiseWaitForMember1Left,
      promiseWaitForMember2Left,
      promiseWaitForMember3Left,
    ])
  })
})
