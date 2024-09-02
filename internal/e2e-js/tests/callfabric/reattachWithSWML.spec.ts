import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectCallJoined,
  expectMCUVisible,
} from '../../utils'

test.describe('CallFabric Reattach with SWML', () => {
  test('should reattach with SWML TTS', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const swmlTTS = {
      sections: {
        main: [
          'answer',
          {
            play: {
              volume: 10,
              urls: [
                'say:Hi',
                'say:Welcome to SignalWire',
                "say:Thank you for calling us. All our lines are currently busy, but your call is important to us. Please hang up, and we'll return your call as soon as our representative is available.",
                "say:Thank you for calling us. All our lines are currently busy, but your call is important to us. Please hang up, and we'll return your call as soon as our representative is available.",
              ],
            },
          },
        ],
      },
    }

    const resourceName = `e2e-reattach-swml-app_${uuid()}`
    await resource.createSWMLAppResource({
      name: resourceName,
      contents: swmlTTS,
    })

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await expectCallJoined(page, {
      to: `/private/${resourceName}`,
    })

    expect(roomSession.room_session).toBeDefined()

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address and join a video room
    const roomSessionReattached = await expectCallJoined(page, {
      to: `/private/${resourceName}`,
    })
    console.timeEnd('reattach-time')

    expect(roomSessionReattached.room_session).toBeDefined()

    expect(roomSession.call_id).toBe(roomSessionReattached.call_id)
    expect(roomSession.member_id).toBe(roomSessionReattached.member_id)
  })

  test('should reattach with SWML to Room', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-reattach-swml-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    const swmlToRoom = {
      sections: {
        main: [
          'answer',
          {
            play: {
              volume: 10,
              urls: [
                'say:Hello, connecting to a fabric resource that is a room',
              ],
            },
            connect: {
              to: `/public/${roomName}`,
              answer_on_bridge: true,
            },
          },
        ],
      },
    }

    const resourceName = `e2e-reattach-swml-app_${uuid()}`
    await resource.createSWMLAppResource({
      name: resourceName,
      contents: swmlToRoom,
    })

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await expectCallJoined(page, {
      to: `/private/${resourceName}`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address and join a video room
    const roomSessionReattached = await expectCallJoined(page, {
      to: `/private/${resourceName}`,
    })
    console.timeEnd('reattach-time')

    expect(roomSessionReattached.room_session).toBeDefined()

    await expectMCUVisible(page)

    expect(roomSession.call_id).toBe(roomSessionReattached.call_id)
    expect(roomSession.member_id).toBe(roomSessionReattached.member_id)
  })
})
