import {
  uuid,
  VideoLayoutChangedEventParams,
  VideoPosition,
} from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  SERVER_URL,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Video Room Layout', () => {
  test('should join a room and be able to change the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-layout_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Set the 8x8 layout ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        const expectLayout = '8x8'
        // @ts-expect-error
        const roomObj: CallFabricRoomSession = window._roomObj

        const layoutUpdated = new Promise((resolve) => {
          roomObj.on(
            'layout.changed',
            (params: VideoLayoutChangedEventParams) => {
              if (
                params.room_session_id === roomSessionId &&
                params.layout.id == expectLayout
              ) {
                resolve(true)
              }
            }
          )
        })

        await roomObj.setLayout({ name: expectLayout })

        return layoutUpdated
      },
      { roomSessionId: roomSession.room_session.room_session_id }
    )
  })

  test('should join a room and be able to change the member position in the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-layout-position_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Assert the current layout and position ---------------
    const { currentLayout, currentPosition } = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: CallFabricRoomSession = window._roomObj
      return {
        currentLayout: roomObj.currentLayout,
        currentPosition: roomObj.currentPosition,
      }
    })
    expect(currentLayout).toBeDefined()
    expect(currentPosition).toBeDefined()

    const secondPosition = currentLayout?.layers[1].position
    expect(secondPosition).toBeDefined()

    expect(currentPosition).not.toBe(secondPosition)

    // --------------- Set position based on the current layout ---------------
    await page.evaluate(
      async ({ roomSessionId, secondPosition }) => {
        // @ts-expect-error
        const roomObj: CallFabricRoomSession = window._roomObj

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.room_session_id === roomSessionId &&
              params.member.current_position === secondPosition
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setPositions({
          positions: { self: secondPosition as VideoPosition },
        })

        return memberUpdated
      },
      {
        roomSessionId: roomSession.room_session.room_session_id,
        secondPosition,
      }
    )
  })

  // TODO: Complete this
  test.skip('should join a room and be able to change other member position in the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-video-layout-position_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    // Create client for pageOne and Dial an address to join a video room
    await createCFClient(pageOne)
    const roomSessionOne = await dialAddress(pageOne, {
      address: `/public/${roomName}`,
    })
    expect(roomSessionOne.room_session).toBeDefined()
    await expectMCUVisible(pageOne)

    // Create client for pageTwo and Dial an address to join a video room
    await createCFClient(pageOne)
    const roomSessionTwo = await dialAddress(pageTwo, {
      address: `/public/${roomName}`,
    })
    expect(roomSessionTwo.room_session).toBeDefined()
    await expectMCUVisible(pageTwo)

    // --------------- Assert the current layout and position ---------------
    const { currentLayout, currentPosition } = await pageOne.evaluate(
      async () => {
        // @ts-expect-error
        const roomObj: CallFabricRoomSession = window._roomObj
        return {
          currentLayout: roomObj.currentLayout,
          currentPosition: roomObj.currentPosition,
        }
      }
    )
    expect(currentLayout).toBeDefined()
    expect(currentPosition).toBeDefined()

    console.log('>> currentLayout', currentLayout)

    // const secondPosition = currentLayout?.layers[1].position
    // expect(secondPosition).toBeDefined()

    // expect(currentPosition).not.toBe(secondPosition)

    // // --------------- Set position based on the current layout ---------------
    // await page.evaluate(
    //   async ({ roomSessionId, secondPosition }) => {
    //     // @ts-expect-error
    //     const roomObj: CallFabricRoomSession = window._roomObj

    //     const memberUpdated = new Promise((resolve) => {
    //       roomObj.on('member.updated', (params) => {
    //         if (
    //           params.room_session_id === roomSessionId &&
    //           params.member.current_position === secondPosition
    //         ) {
    //           resolve(true)
    //         }
    //       })
    //     })

    //     await roomObj.setPositions({
    //       positions: { self: secondPosition as VideoPosition },
    //     })

    //     return memberUpdated
    //   },
    //   {
    //     roomSessionId: roomSession.room_session.room_session_id,
    //     secondPosition,
    //   }
    // )
  })
})
