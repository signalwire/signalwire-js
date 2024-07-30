import { expect, Page, test } from '../../fixtures'

import {
  SERVER_URL,
  createCallWithCompatibilityApi,
  createTestJWTToken,
  expectInjectIceTransportPolicy,
  expectedMinPackets,
  expectInjectRelayHost,
  expectRelayConnected,
  expectv2HasReceivedAudio,
  expectv2HasReceivedSilence,
  getDialConferenceLaml,
  randomizeResourceName
} from '../../utils'

const v2WebrtcFromRestSilenceDescription = 'should handle a call from REST API to v2 client, playing silence at answer'
test.describe('v2WebrtcFromRestSilence', () => {
  test(v2WebrtcFromRestSilenceDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', v2WebrtcFromRestSilenceDescription)

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

    // With 40 seconds we can catch a media timeout
    const callDurationMs = 40000
    await pageCallee.waitForTimeout(callDurationMs)

    // We want to ensure at this point the call hasn't timed out
    await expectCallActive(pageCallee)

    console.log('Time to check the audio energy at ', new Date())

    // We expect silence...
    const maxAudioEnergy = 0.01

    // Check the audio energy level is above threshold
    console.log('Expected max audio energy: ', maxAudioEnergy)

    // Expect at least 70 % packets at 50 pps
    const minPackets = expectedMinPackets(50, callDurationMs, 0.3)
    await expectv2HasReceivedSilence(pageCallee, maxAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    console.log('Hanging up the call at ', new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    console.info('END: ', v2WebrtcFromRestSilenceDescription)
  })
})

const v2WebrtcFromRestDescription = 'should handle a call from REST API to v2 client, dialing into a Conference at answer'
test.describe('v2WebrtcFromRest', () => {
  test(v2WebrtcFromRestDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', v2WebrtcFromRestDescription)

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

    // With 40 seconds we can catch a media timeout
    const callDurationMs = 40000
    await pageCallee.waitForTimeout(callDurationMs)

    // Ensure the call hasn't been hang up, e.g. by a media timeout
    await expectCallActive(pageCallee)

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 50000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Expect at least 70 % packets at 50 pps
    const minPackets = expectedMinPackets(50, callDurationMs, 0.3)

    await expectv2HasReceivedAudio(pageCallee, minAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    console.log('Hanging up the call at ', new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    console.info('END: ', v2WebrtcFromRestDescription)
  })
})

const v2WebrtcFromRestTwoJoinAudioVideoDescription = 'should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio/video'
test.describe('v2WebrtcFromRestTwoJoinAudioVideo', () => {
  test(v2WebrtcFromRestTwoJoinAudioVideoDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', v2WebrtcFromRestTwoJoinAudioVideoDescription)

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

    // With 40 seconds we can catch a media timeout
    const callDurationMs = 40000
    await pageCallee.waitForTimeout(callDurationMs)

    await Promise.all([
      expectCallActive(pageCallee),
      expectCallActive(pageCallee2)
    ])

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 8000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Expect at least 70 % packets at 50 pps
    const minPackets = expectedMinPackets(50, callDurationMs, 0.3)

    await expectv2HasReceivedAudio(pageCallee, minAudioEnergy, minPackets)
    await expectv2HasReceivedAudio(pageCallee2, minAudioEnergy, minPackets)

    await expectCallActive(pageCallee)
    await expectCallActive(pageCallee2)

    console.log('Hanging up the calls at ', new Date())

    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    await pageCallee2.click('#hangupCall')
    await expectCallHangup(pageCallee2)

    console.info('END: ', v2WebrtcFromRestTwoJoinAudioVideoDescription)
  })
})

const v2WebrtcFromRestTwoJoinAudioTURNDescription = 'should handle a call from REST API to 2 v2 clients, dialing both into a Conference at answer, audio G711, TURN only'
test.describe('v2WebrtcFromRestTwoJoinAudioTURN', () => {
  test(v2WebrtcFromRestTwoJoinAudioTURNDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', v2WebrtcFromRestTwoJoinAudioTURNDescription)

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

    const pageCallee1 = await createCustomVanillaPage({ name: '[callee1]' })
    await pageCallee1.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee2 = await createCustomVanillaPage({ name: '[callee2]' })
    await pageCallee2.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee1, relayHost)
    await expectInjectRelayHost(pageCallee2, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource1 = randomizeResourceName()
    const jwtCallee1 = await createTestJWTToken({ resource: resource1 })
    expect(jwtCallee1).not.toBe(null)

    const resource2 = randomizeResourceName()
    const jwtCallee2 = await createTestJWTToken({ resource: resource2 })
    expect(jwtCallee2).not.toBe(null)

    await expectRelayConnected(pageCallee1, envRelayProject, jwtCallee1)
    await expectRelayConnected(pageCallee2, envRelayProject, jwtCallee2)

    const inlineLaml = getDialConferenceLaml('v2rest2turn')
    console.log('inline Laml: ', inlineLaml)

    // Call to first callee

    // Force TURN only
    await expectInjectIceTransportPolicy(pageCallee1, 'relay')

    const createResult = await createCallWithCompatibilityApi(
      resource1,
      inlineLaml,
      'PCMU,PCMA'
    )
    expect(createResult).toBe(201)
    console.log('callee1 REST API returned 201 at ', new Date())

    const callStatusCallee1 = pageCallee1.locator('#callStatus')
    expect(callStatusCallee1).not.toBe(null)
    await expect(callStatusCallee1).toContainText('-> active')

    console.log('call1 is active at ', new Date())

    // Call to second callee

    // Force TURN only
    await expectInjectIceTransportPolicy(pageCallee2, 'relay')

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

    console.log('call2 is active at ', new Date())

    // With 40 seconds we can catch a media timeout
    const callDurationMs = 40000
    await pageCallee1.waitForTimeout(callDurationMs)

    await Promise.all([
      expect(callStatusCallee1).toContainText('-> active'),
      expect(callStatusCallee2).toContainText('-> active')
    ])

    console.log('Time to check the audio energy at ', new Date())

    // Empirical value; it depends on the call scenario
    // Nothing to do with sample rates
    const minAudioEnergy = callDurationMs / 16000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)

    // Expect at least 70 % packets at 50 pps
    const minPackets = expectedMinPackets(50, callDurationMs, 0.3)

    await Promise.all([
      expectv2HasReceivedAudio(pageCallee1, minAudioEnergy, minPackets),
      expectv2HasReceivedAudio(pageCallee2, minAudioEnergy, minPackets)
    ])

    await Promise.all([
      expectCallActive(pageCallee1),
      expectCallActive(pageCallee2)
    ])

    console.log('Hanging up the calls at ', new Date())

    await Promise.all([
      pageCallee1.click('#hangupCall'),
      pageCallee2.click('#hangupCall')
    ])

    await Promise.all([
      expectCallHangup(pageCallee1),
      expectCallHangup(pageCallee2)
    ])

    console.info('END: ', v2WebrtcFromRestTwoJoinAudioTURNDescription)
  })
})

const v2WebrtcFromRest422Description = 'should handle a call from REST API to v2 client, receiving a 422 from REST API'
test.describe('v2WebrtcFromRest422', () => {
  test(v2WebrtcFromRest422Description, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', v2WebrtcFromRest422Description)

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

    // This won't be used anyway
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
      <Say>
        <prosody volume="silent">Words to speak</prosody>
      </Say>
    </Response>`

    const invalidResource = "e2etest422"
    const createResult = await createCallWithCompatibilityApi(
      invalidResource,
      inlineLaml
    )
    expect(createResult).toBe(422)
    console.info('END: ', v2WebrtcFromRest422Description)
  })
})
