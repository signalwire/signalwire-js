import { expect, Page, test } from '../../fixtures'

import {
  SERVER_URL,
  createCallWithCompatibilityApi,
  createTestJWTToken,
  expectInjectRelayHost,
  expectRelayConnected,
  expectv2HasReceivedAudio,
  expectv2HasReceivedSilence,
  getDialConferenceLaml,
  randomizeResourceName
} from '../../utils'

test.describe('v2WebrtcFromRest', () => {
  test('should handle a call from REST API to v2 client, playing silence at answer', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from REST API to v2 client, playing silence at answer')

    const expectCallActive = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Expect the Hangup button to be enabled (call active)
      await expect(hangupCall).toBeEnabled()
    }

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ resource: resource })
    expect(jwtCallee).not.toBe(null)

    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)

    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
      <Say>
        <prosody volume="silent">Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak Words to speak</prosody>
      </Say>
    </Response>`

    console.log('inline Laml: ', inlineLaml)
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const callDurationMs = 20000
    // Call duration
    await pageCallee.waitForTimeout(callDurationMs)

    console.log('Time to check the audio energy at ', new Date())

    // We expect silence...
    const maxAudioEnergy = 0.01

    // ... but the packets must be received anyway
    const minPackets = (callDurationMs * 0.9) * 50 / 1000

    // Check the audio energy level is above threshold
    console.log('Expected max audio energy: ', maxAudioEnergy)

    await expectv2HasReceivedSilence(pageCallee, maxAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    console.log('Hanging up the call at ', new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    console.info('END: should handle a call from REST API to v2 client, playing silence at answer')
  })
})

test.describe('v2WebrtcFromRest', () => {
  test('should handle a call from REST API to v2 client, dialing into a Conference at answer', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from REST API to v2 client, dialing into a Conference at answer')

    const expectCallActive = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Expect the Hangup button to be enabled (call active)
      await expect(hangupCall).toBeEnabled()
    }

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ resource: resource })
    expect(jwtCallee).not.toBe(null)

    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)

    const inlineLaml = getDialConferenceLaml('v2rest0')

    console.log('inline Laml: ', inlineLaml)
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml,
      'PCMU,PCMA'
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const callDurationMs = 20000
    // Call duration
    await pageCallee.waitForTimeout(callDurationMs)

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 50000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Considers 50 pps with max 10% packet loss
    const minPackets = (callDurationMs * 0.9) * 50 / 1000

    await expectv2HasReceivedAudio(pageCallee, minAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    console.log('Hanging up the call at ', new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    console.info('END: should handle a call from REST API to v2 client, dialing into a Conference at answer')
  })
})

test.describe('v2WebrtcFromRestTwoJoinAudioVideo', () => {
  test('should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio/video', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio/video')

    const expectCallActive = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Expect the Hangup button to be enabled (call active)
      await expect(hangupCall).toBeEnabled()
    }

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee2 = await createCustomVanillaPage({ name: '[callee2]' })
    await pageCallee2.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)
    await expectInjectRelayHost(pageCallee2, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ resource: resource })
    expect(jwtCallee).not.toBe(null)

    const resource2 = randomizeResourceName()
    const jwtCallee2 = await createTestJWTToken({ resource: resource2 })
    expect(jwtCallee2).not.toBe(null)

    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)
    await expectRelayConnected(pageCallee2, envRelayProject, jwtCallee2)

    const inlineLaml = getDialConferenceLaml('v2rest1')

    console.log('inline Laml: ', inlineLaml)
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const createResult2 = await createCallWithCompatibilityApi(
      resource2,
      inlineLaml
    )
    expect(createResult2).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee2 = pageCallee2.locator('#callStatus')
    expect(callStatusCallee2).not.toBe(null)
    await expect(callStatusCallee2).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const callDurationMs = 20000
    // Call duration
    await pageCallee.waitForTimeout(callDurationMs)

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 8000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Considers 50 pps with max 10% packet loss
    const minPackets = (callDurationMs * 0.9) * 50 / 1000

    await expectv2HasReceivedAudio(pageCallee, minAudioEnergy, minPackets)
    await expectv2HasReceivedAudio(pageCallee2, minAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    await expectCallActive(pageCallee2)

    console.log('Hanging up the call2 at ', new Date())

    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    await pageCallee2.click('#hangupCall')
    await expectCallHangup(pageCallee2)

    console.info('END: should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio/video')
  })
})

test.describe('v2WebrtcFromRestTwoJoinAudio', () => {
  test('should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio G711', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio G711')

    const expectCallActive = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Expect the Hangup button to be enabled (call active)
      await expect(hangupCall).toBeEnabled()
    }

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee2 = await createCustomVanillaPage({ name: '[callee2]' })
    await pageCallee2.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)
    await expectInjectRelayHost(pageCallee2, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ resource: resource })
    expect(jwtCallee).not.toBe(null)

    const resource2 = randomizeResourceName()
    const jwtCallee2 = await createTestJWTToken({ resource: resource2 })
    expect(jwtCallee2).not.toBe(null)

    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)
    await expectRelayConnected(pageCallee2, envRelayProject, jwtCallee2)

    const inlineLaml = getDialConferenceLaml('v2rest2')

    console.log('inline Laml: ', inlineLaml)
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml,
      'PCMU,PCMA'
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const createResult2 = await createCallWithCompatibilityApi(
      resource2,
      inlineLaml,
      'PCMU,PCMA'
    )
    expect(createResult2).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const callStatusCallee2 = pageCallee2.locator('#callStatus')
    expect(callStatusCallee2).not.toBe(null)
    await expect(callStatusCallee2).toContainText('-> active')

    console.log('The call is active at ', new Date())

    const callDurationMs = 20000
    // Call duration
    await pageCallee.waitForTimeout(callDurationMs)

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 8000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Considers 50 pps with max 10% packet loss
    const minPackets = (callDurationMs * 0.9) * 50 / 1000

    await expectv2HasReceivedAudio(pageCallee, minAudioEnergy, minPackets)
    await expectv2HasReceivedAudio(pageCallee2, minAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    await expectCallActive(pageCallee2)

    console.log('Hanging up the call2 at ', new Date())

    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    await pageCallee2.click('#hangupCall')
    await expectCallHangup(pageCallee2)

    console.info('END: should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio G711')
  })
})