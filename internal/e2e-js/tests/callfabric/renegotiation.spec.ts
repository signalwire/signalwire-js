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
  test('it should join a room with audio channel and enable "sendrecv" video', async ({
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

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession = window._roomObj as CallFabricRoomSession
      await cfRoomSession.enableVideo()
    })

    await expectMCUVisible(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')
  })

  test('it should join a room with audio channel and enable "sendonly" video', async ({
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

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession = window._roomObj as CallFabricRoomSession
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: false })
    })

    await page.waitForTimeout(1000)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).not.toHaveProperty('video')
  })

  test('it should join a room with audio channel and enable "recvonly" video', async ({
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

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession = window._roomObj as CallFabricRoomSession
      await cfRoomSession.enableVideo({ video: false, negotiateVideo: true })
    })

    await expectMCUVisibleForAudience(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).not.toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')
  })
})
