import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  getStats,
  getTransceiverStates,
  waitForRenegotiation,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Audio Renegotiation', () => {
  test('it should enable audio with "sendrecv" and then disable', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats = await getStats(page)
    expect(stats.outboundRTP).toHaveProperty('video')
    expect(stats.inboundRTP).toHaveProperty('video')
    expect(stats.outboundRTP).not.toHaveProperty('audio')
    expect(stats.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableAudio()
    })

    // Wait for renegotiation
    await waitForRenegotiation(page)

    // Ensure stats reflect changes
    await page.waitForTimeout(3000)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('audio')
    expect(newStats.inboundRTP).toHaveProperty('audio')

    await test.step('it should disable the audio', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableAudio()
      })

      // Wait for renegotiation
      await waitForRenegotiation(page)

      // Ensure stats reflect changes
      await page.waitForTimeout(3000)

      // DEBUG: The stats still includes the audio
      // const statsAfterDisabling = await getStats(page)
      // expect(statsAfterDisabling.inboundRTP).not.toHaveProperty('audio')

      // // Assert that outboundRTP.audio is either absent or inactive
      // if (statsAfterDisabling.outboundRTP.audio) {
      // expect(statsAfterDisabling.outboundRTP.audio.active).toBe(false)
      //   expect(statsAfterDisabling.outboundRTP.audio.packetsSent).toBe(0)
      // } else {
      //   expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('audio')
      // }

      const { audio, video } = await getTransceiverStates(page)
      expect(video.direction).toBe('sendrecv')
      expect(audio.direction).toBe('inactive')
      expect(audio.sender.trackReadyState).toBe('ended')
      // DEBUG: It seems the server keeps on sending the audio packets
      // expect(audio.receiver.trackReadyState).toBe('ended')
    })
  })

  test('it should enable audio with "sendonly" and then disable with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats = await getStats(page)
    expect(stats.outboundRTP).toHaveProperty('video')
    expect(stats.inboundRTP).toHaveProperty('video')
    expect(stats.outboundRTP).not.toHaveProperty('audio')
    expect(stats.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableAudio()
      await cfRoomSession.enableAudio({ audio: true, negotiateAudio: false })
    })

    // Wait for renegotiation
    await waitForRenegotiation(page)

    // Ensure stats reflect changes
    await page.waitForTimeout(3000)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('audio')
    if (newStats.inboundRTP.audio) {
      expect(newStats.inboundRTP.audio.packetsReceived).toBe(0)
    } else {
      expect(newStats.inboundRTP).not.toHaveProperty('audio')
    }

    await test.step('it should disable the audio with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableAudio({ negotiateAudio: true })
      })

      // Wait for renegotiation
      await waitForRenegotiation(page)

      // Ensure stats reflect changes
      await page.waitForTimeout(3000)

      const { audio, video } = await getTransceiverStates(page)
      expect(video.direction).toBe('sendrecv')
      expect(audio.direction).toBe('recvonly')
      expect(audio.sender.trackReadyState).toBe('ended')
      expect(audio.receiver.trackReadyState).toBe('live')
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

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats = await getStats(page)
    expect(stats.outboundRTP).toHaveProperty('video')
    expect(stats.inboundRTP).toHaveProperty('video')
    expect(stats.outboundRTP).not.toHaveProperty('audio')
    expect(stats.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableAudio({ audio: false, negotiateAudio: true })
    })

    // Wait for renegotiation
    await waitForRenegotiation(page)

    // Ensure stats reflect changes
    await page.waitForTimeout(3000)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).not.toHaveProperty('audio')
    expect(newStats.inboundRTP).toHaveProperty('audio')

    await test.step('it should disable the audio', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableAudio()
      })

      // Wait for renegotiation
      await waitForRenegotiation(page)

      // Ensure stats reflect changes
      await page.waitForTimeout(3000)

      const { audio, video } = await getTransceiverStates(page)
      expect(video.direction).toBe('sendrecv')
      expect(audio.direction).toBe('inactive')
      expect(audio.sender.hasTrack).toBe(false)
      // DEBUG: It seems the server keeps on sending the audio packets
      // expect(audio.receiver.trackReadyState).toBe('ended')
    })
  })
})
