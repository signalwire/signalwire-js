import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  getStats,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Renegotiation', () => {

  test('Joining a room with audio channel only and enable sendrecv video', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    await page.waitForTimeout(1000)

    let stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')

    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession =  (window._roomObj as CallFabricRoomSession)
        
        await cfRoomSession.enableVideo();
    });

    await page.waitForTimeout(2000)

    stats = await getStats(page)

    expect(stats.outboundRTP).toHaveProperty('video')
    expect(stats.inboundRTP).toHaveProperty('video')

    await page.waitForTimeout(3000)
    expectMCUVisible(page)
  })

  test('Joining a room with audio channel only and enable sendOnly video', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await dialAddress(page, {
	  address: `/public/${roomName}?channel=audio`,
	})

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    await page.waitForTimeout(1000)

    let stats = await getStats(page)

    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')

    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession =  (window._roomObj as CallFabricRoomSession)
        
        await cfRoomSession.enableVideo({sendOnly: true});
    });

    await page.waitForTimeout(1000)

    stats = await getStats(page)

    expect(stats.outboundRTP).toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
  })

  test('Joining a room with audio channel only and enable recvOnly video', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    await page.waitForTimeout(1000)

    let stats = await getStats(page)

    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')

    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession =  (window._roomObj as CallFabricRoomSession)
        
        await cfRoomSession.enableVideo({video: false, sendOnly: false});
    });

    await page.waitForTimeout(1000)

    stats = await getStats(page)

    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).toHaveProperty('video')

    await page.waitForTimeout(2000)
    expectMCUVisibleForAudience(page)
  })
})
