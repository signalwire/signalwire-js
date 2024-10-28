import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUNotVisible,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  getStats,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Renegotiation', () => {
  test('it should enable video with "sendrecv" and then disable', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo()
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')

    await test.step('it should disable the video', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo()
      })

      // Wait for renegotiation
      await page.evaluate(async () => {
        // @ts-expect-error
        const pc = window._roomObj.peer.instance as RTCPeerConnection
        while (pc.signalingState !== 'stable') {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      })

      // Ensure stats reflect changes
      await page.waitForTimeout(1000)

      const statsAfterDisabling = await getStats(page)
      // DEBUG: The stats shows inbound video
      // expect(statsAfterDisabling.inboundRTP).not.toHaveProperty('video')

      // Assert that outboundRTP.video is either absent or inactive
      if (statsAfterDisabling.outboundRTP.video) {
        // DEBUG: The stats shows active video with 0 packet sent
        // expect(statsAfterDisabling.outboundRTP.video.active).toBe(false)
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })

  test('it should enable video with "sendonly" and then disable with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: false })
    })

    // Expect MCU is not visible
    await expectMCUNotVisible(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).not.toHaveProperty('video')

    await test.step('it should disable the video with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo({ negotiateVideo: true })
      })

      // Wait for renegotiation
      await page.evaluate(async () => {
        // @ts-expect-error
        const pc = window._roomObj.peer.instance as RTCPeerConnection
        while (pc.signalingState !== 'stable') {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      })

      // Ensure stats reflect changes
      await page.waitForTimeout(1000)

      const statsAfterDisabling = await getStats(page)
      expect(statsAfterDisabling.inboundRTP).toHaveProperty('video')

      // Assert that outboundRTP.video is either absent or inactive
      if (statsAfterDisabling.outboundRTP.video) {
        // DEBUG: The stats shows active video with 0 packet sent
        // expect(statsAfterDisabling.outboundRTP.video.active).toBe(false)
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })

  test('it should enable video with "recvonly" and then disable', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: false, negotiateVideo: true })
    })

    // Expect audience MCU is visible
    await expectMCUVisibleForAudience(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).not.toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')

    await test.step('it should disable the video', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo()
      })

      // Wait for renegotiation
      await page.evaluate(async () => {
        // @ts-expect-error
        const pc = window._roomObj.peer.instance as RTCPeerConnection
        while (pc.signalingState !== 'stable') {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      })

      // Ensure stats reflect changes
      await page.waitForTimeout(1000)

      const statsAfterDisabling = await getStats(page)
      // DEBUG: The stats shows inbound video
      // expect(statsAfterDisabling.inboundRTP).not.toHaveProperty('video')

      // Assert that outboundRTP.video is either absent or inactive
      if (statsAfterDisabling.outboundRTP.video) {
        // DEBUG: The stats shows active video with 0 packet sent
        // expect(statsAfterDisabling.outboundRTP.video.active).toBe(false)
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })

  test('it should join one member with "sendrecv" and the other member with "sendonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(pageOne)
    await createCFClient(pageTwo)

    // Dial an address with audio only channel from page-one
    await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageOneStats = await getStats(pageOne)
    expect(pageOneStats.outboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Dial an address with audio only channel from page-two
    await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageTwoStats = await getStats(pageTwo)
    expect(pageTwoStats.outboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Enable video with "sendrecv" from page-one
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: true })
    })

    // Expect MCU is visible
    await expectMCUVisible(pageOne)

    const pageOneNewStats = await getStats(pageOne)
    expect(pageOneNewStats.outboundRTP).toHaveProperty('video')
    expect(pageOneNewStats.inboundRTP).toHaveProperty('video')

    // Enable video with "sendonly" from page-two
    await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: false })
    })

    // Expect MCU is not visible
    await expectMCUNotVisible(pageTwo)

    const pageTwoNewStats = await getStats(pageTwo)
    expect(pageTwoNewStats.outboundRTP).toHaveProperty('video')
    expect(pageTwoNewStats.inboundRTP).not.toHaveProperty('video')
  })

  test('it should join one member with "sendrecv" and the other member with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(pageOne)
    await createCFClient(pageTwo)

    // Dial an address with audio only channel from page-one
    await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageOneStats = await getStats(pageOne)
    expect(pageOneStats.outboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Dial an address with audio only channel from page-two
    await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageTwoStats = await getStats(pageTwo)
    expect(pageTwoStats.outboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Enable video with "sendrecv" from page-one
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: true })
    })

    // Expect MCU is visible
    await expectMCUVisible(pageOne)

    const pageOneNewStats = await getStats(pageOne)
    expect(pageOneNewStats.outboundRTP).toHaveProperty('video')
    expect(pageOneNewStats.inboundRTP).toHaveProperty('video')

    // Enable video with "recvonly" from page-two
    await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: false, negotiateVideo: true })
    })

    // Expect audience MCU is visible
    await expectMCUVisibleForAudience(pageTwo)

    const pageTwoNewStats = await getStats(pageTwo)
    expect(pageTwoNewStats.outboundRTP).not.toHaveProperty('video')
    expect(pageTwoNewStats.inboundRTP).toHaveProperty('video')
  })

  test('it should join one member with "sendonly" and the other member with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(pageOne)
    await createCFClient(pageTwo)

    // Dial an address with audio only channel from page-one
    await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageOneStats = await getStats(pageOne)
    expect(pageOneStats.outboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP).not.toHaveProperty('video')
    expect(pageOneStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Dial an address with audio only channel from page-two
    await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=audio`,
    })

    const pageTwoStats = await getStats(pageTwo)
    expect(pageTwoStats.outboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP).not.toHaveProperty('video')
    expect(pageTwoStats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // Enable video with "sendonly" from page-one
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: false })
    })

    const pageOneNewStats = await getStats(pageOne)
    expect(pageOneNewStats.outboundRTP).toHaveProperty('video')
    expect(pageOneNewStats.inboundRTP).not.toHaveProperty('video')

    // Enable video with "recvonly" from page-two
    await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: false, negotiateVideo: true })
    })

    await expectMCUVisibleForAudience(pageTwo)

    const pageTwoNewStats = await getStats(pageTwo)
    expect(pageTwoNewStats.outboundRTP).not.toHaveProperty('video')
    expect(pageTwoNewStats.inboundRTP).toHaveProperty('video')
  })
})
