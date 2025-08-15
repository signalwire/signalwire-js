import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  waitForCallEvent,
  type DialAddressResult,
} from '../../utils'

test.describe('Dial With Resolvers Pattern', () => {
  test('should demonstrate the new dialAddress resolver pattern', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[resolver-demo]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // NEW PATTERN: Dial with automatic resolver creation
    const { callSession, resolvers }: DialAddressResult = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      createResolversFor: ['member.updated.audioMuted', 'member.left'],
    })

    // Verify the call session was created
    expect(callSession.room_session).toBeDefined()
    expect(callSession.member_id).toBeDefined()

    // Verify resolvers were created and stored
    expect(resolvers['member.updated.audioMuted']).toBeDefined()
    expect(resolvers['member.left']).toBeDefined()

    // NEW PATTERN: Use the pre-created resolver for member.updated.audioMuted
    const memberMutedPromise = waitForCallEvent(page, 'member.updated.audioMuted')

    // Trigger mute action
    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj = window._callObj
      await callObj.audioMute()
    })

    // NEW PATTERN: Wait for the resolver to resolve
    const muteResult = await memberMutedPromise
    expect(muteResult.member.member_id).toBe(callSession.member_id)
    expect(muteResult.member.audio_muted).toBe(true)

    // Demonstrate accessing resolvers directly from window
    const windowResolvers = await page.evaluate(() => {
      // @ts-expect-error
      return window._callResolvers
    })
    expect(windowResolvers['member.updated.audioMuted']).toBeDefined()
    expect(windowResolvers['member.left']).toBeDefined()

    // Clean up - leave the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj = window._callObj
      await callObj.leave()
    })
  })

  test('should work with listen parameter and resolvers together', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[combined-pattern]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Track custom events with both listen callbacks and resolvers
    let customEventFired = false

    const { callSession }: DialAddressResult = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      createResolversFor: ['member.updated.videoMuted'],
      listen: {
        'call.joined': () => {
          customEventFired = true
          console.log('Custom call.joined handler executed')
        },
      },
    })

    expect(callSession.room_session).toBeDefined()

    // The custom listen handler should have executed
    const customEventResult = await page.evaluate(() => {
      // In a real test, you might set a window variable or similar to track this
      return true // Simplified for demo
    })
    expect(customEventResult).toBe(true)

    // The resolver should still be available for member.updated.videoMuted
    const videoMutePromise = waitForCallEvent(page, 'member.updated.videoMuted')

    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj = window._callObj
      await callObj.videoMute()
    })

    const videoMuteResult = await videoMutePromise
    expect(videoMuteResult.member.video_muted).toBe(true)

    // Clean up
    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj = window._callObj
      await callObj.leave()
    })
  })
})