import {
  uuid,
  VideoPosition,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  SERVER_URL,
} from '../../utils'
import { CallSession } from '@signalwire/client'

test.describe('CallFabric Video Room Layout', () => {
  test('should join a room and be able to change the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Set the 8x8 layout ---------------
    await page.evaluate(
      async ({ callSessionId }) => {
        const expectLayout = '8x8'
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const layoutUpdated = new Promise((resolve) => {
          callObj.on('layout.changed', (params) => {
            if (
              params.room_session_id === callSessionId &&
              params.layout.id == expectLayout
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setLayout({ name: expectLayout })

        return layoutUpdated
      },
      { callSessionId: callSession.room_session.room_session_id }
    )
  })

  test('should join a room and be able to change the member position in the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Assert the current layout and position ---------------
    const { currentLayout, currentPosition } = await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj
      return {
        currentLayout: callObj.currentLayout,
        currentPosition: callObj.currentPosition,
      }
    })
    expect(currentLayout).toBeDefined()
    expect(currentPosition).toBeDefined()

    const secondPosition = currentLayout?.layers[1].position
    expect(secondPosition).toBeDefined()

    expect(currentPosition).not.toBe(secondPosition)

    // --------------- Set position based on the current layout ---------------
    await page.evaluate(
      async ({ callSessionId, secondPosition }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params) => {
            if (
              params.room_session_id === callSessionId &&
              params.member.current_position === secondPosition
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setPositions({
          positions: { self: secondPosition as VideoPosition },
        })

        return memberUpdated
      },
      {
        callSessionId: callSession.room_session.room_session_id,
        secondPosition,
      }
    )
  })

  // FIXME: Enable this when layout.changed event returns the member_id consistently
  // See: https://github.com/signalwire/cloud-product/issues/12018
  test.skip('should join a room and be able to change other member position in the layout', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    // Create client for pageOne and Dial an address to join a video room
    await createCFClient(pageOne)
    const callSessionOne = (await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=video`,
    })) as VideoRoomSubscribedEventParams
    expect(callSessionOne.room_session).toBeDefined()
    await expectMCUVisible(pageOne)

    // Create client for pageTwo and Dial an address to join a video room
    await createCFClient(pageTwo)
    const callSessionTwo = (await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=video`,
    })) as VideoRoomSubscribedEventParams
    expect(callSessionTwo.room_session).toBeDefined()
    await expectMCUVisible(pageTwo)

    // --------------- Assert the current layout and position ---------------
    const { currentLayout, currentPosition } = await pageTwo.evaluate(
      async () => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj
        return {
          currentLayout: callObj.currentLayout,
          currentPosition: callObj.currentPosition,
        }
      }
    )
    expect(currentLayout).toBeDefined()
    expect(currentPosition).toBeDefined()

    // Assert the member_id should be present in the layout
    const layers = currentLayout.layers.filter((layer) => !!layer.member_id)
    await test.step('it should verify layout layers have length of 2', async () => {
      expect(layers).toHaveLength(2)
    })

    // Assert the room's member_id should match with the layout's member_id
    const [memberOneLayer, memberTwoLayer] = currentLayout.layers
    await test.step('it should verify layout layers matches the member_id', async () => {
      expect(memberOneLayer).toBeDefined()
      expect(memberTwoLayer).toBeDefined()
      expect(callSessionOne.member_id).toBe(memberOneLayer.member_id)
      expect(callSessionTwo.member_id).toBe(memberTwoLayer.member_id)
    })

    // --------------- Set the playback position for the second member via pageTwo ---------------
    const pageOneRecievedEvent = pageTwo.evaluate(
      async ({ memberTwoId, callSessionOneId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params) => {
            if (
              params.room_session_id === callSessionOneId &&
              params.member.member_id === memberTwoId &&
              params.member.current_position === ('playback' as VideoPosition)
            ) {
              resolve(true)
            }
          })
        })

        return memberUpdated
      },
      {
        memberTwoId: callSessionTwo.member_id,
        callSessionOneId: callSessionOne.room_session.id,
      }
    )

    const pageTwoRecievedEvent = pageTwo.evaluate(
      async ({ memberTwoId, callSessionTwoId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params) => {
            if (
              params.room_session_id === callSessionTwoId &&
              params.member.member_id === memberTwoId &&
              params.member.current_position === ('playback' as VideoPosition)
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setPositions({
          positions: { [memberTwoId]: 'playback' as VideoPosition },
        })

        return memberUpdated
      },
      {
        memberTwoId: callSessionTwo.member_id,
        callSessionTwoId: callSessionTwo.room_session.id,
      }
    )

    await pageOneRecievedEvent
    await pageTwoRecievedEvent
  })
})
