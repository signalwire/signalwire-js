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
  randomizeResourceName,
  MockWebhookServer,
} from '../../utils'

const silenceDescription = 'should handle a call from REST API to v2 client, playing silence at answer'
test.describe('v2WebrtcFromRestSilence', () => {
  test(silenceDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', silenceDescription)

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

    // Set to 30 seconds to keep it running during the 20 seconds call
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
      <Pause length="30"/>
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

    console.info('END: ', silenceDescription)
  })
})

const conferenceDescription = 'should handle a call from REST API to v2 client, dialing into a Conference at answer'
test.describe('v2WebrtcFromRest', () => {
  test(conferenceDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', conferenceDescription)

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

    console.info('END: ', conferenceDescription)
  })
})

const twoJoinAudioVideoDescription = 'should handle a call from REST API to v2 clients, dialing both into a Conference at answer, audio/video'
test.describe('v2WebrtcFromRestTwoJoinAudioVideo', () => {
  test(twoJoinAudioVideoDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', twoJoinAudioVideoDescription)

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

    // An empirical value that depends on the call duration
    // Nothing to do with sample rates
    const minAudioEnergy = callDurationMs / 16000

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

    console.info('END: ', twoJoinAudioVideoDescription)
  })
})

const twoJoinAudioTURNDescription = 'should handle a call from REST API to 2 v2 clients, dialing both into a Conference at answer, audio G711, TURN only'
test.describe('v2WebrtcFromRestTwoJoinAudioTURN', () => {
  test(twoJoinAudioTURNDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', twoJoinAudioTURNDescription)

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

    // An empirical value that depends on the call duration
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

    console.info('END: ', twoJoinAudioTURNDescription)
  })
})

const get422Description = 'should handle a call from REST API to v2 client, receiving a 422 from REST API'
test.describe('v2WebrtcFromRest422', () => {
  test(get422Description, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', get422Description)

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
    console.info('END: ', get422Description)
  })
})

const callStatusWebhookDescription = 'should receive call status webhook callback'

test.describe('v2WebRTCFromRestCallStatusWebhook', () => {
  test(callStatusWebhookDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', callStatusWebhookDescription)
    const mockWebhookServer = new MockWebhookServer()
    const tunnelLink = await mockWebhookServer.listen(19898, true)
    expect(tunnelLink).toMatch(/^http:\/\/.*\.zrok.swire.io/)

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

    // Set to 30 seconds to keep it running during the 20 seconds call
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
      <Pause length="30"/>
    </Response>`

    console.log('inline Laml: ', inlineLaml)
    const initiatedCallbackRequest = mockWebhookServer.waitFor('initiated')
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml,
      undefined,
      tunnelLink,
      ['initiated', 'ringing', 'answered', 'completed']
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())
    const initiatedStatus = await initiatedCallbackRequest

    expect(initiatedStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN}`,
      CallStatus: 'initiated',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })

    const ringingCallbackRequest = mockWebhookServer.waitFor('ringing')
    const answeredCallbackRequest = mockWebhookServer.waitFor('answered')
    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    const ringingStatus = await ringingCallbackRequest
    const answeredStatus = await answeredCallbackRequest

    expect(ringingStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN}`,
      CallStatus: 'ringing',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })

    expect(answeredStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN}`,
      CallStatus: 'answered',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })
    console.log('The call is active at ', new Date())

    const callDurationMs = 20000
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
    const completedCallbackRequest = mockWebhookServer.waitFor('completed')
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)
    
    const completedStatus = await completedCallbackRequest
    await mockWebhookServer.close()

    expect(completedStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN}`,
      CallStatus: 'completed',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })
    console.info('END: ', callStatusWebhookDescription)
  })
})


const conferenceWebhookDescription = 'should receive conference status webhook callbacks'
test.describe('v2WebrtcFromRest', () => {
  test(conferenceWebhookDescription, async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: ', conferenceWebhookDescription)
    const mockWebhookServer = new MockWebhookServer()
    const tunnelLink = await mockWebhookServer.listen(19898, true)
    expect(tunnelLink).toMatch(/^http:\/\/.*\.zrok.swire.io/)
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
    const initiatedCallbackRequest = mockWebhookServer.waitFor('initiated')
    const createResult = await createCallWithCompatibilityApi(
      resource,
      inlineLaml,
      'PCMU,PCMA',
      tunnelLink,
      ['initiated', 'ringing', 'answered', 'completed']
    )
    expect(createResult).toBe(201)
    console.log('REST API returned 201 at ', new Date())

    const initiatedStatus = await initiatedCallbackRequest

    expect(initiatedStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN};codecs=PCMU,PCMA`,
      CallStatus: 'initiated',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })

    const ringingCallbackRequest = mockWebhookServer.waitFor('ringing')
    const answeredCallbackRequest = mockWebhookServer.waitFor('answered')
    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    const ringingStatus = await ringingCallbackRequest
    const answeredStatus = await answeredCallbackRequest

    expect(ringingStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN};codecs=PCMU,PCMA`,
      CallStatus: 'ringing',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })

    expect(answeredStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN};codecs=PCMU,PCMA`,
      CallStatus: 'answered',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })
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
    const completedCallbackRequest = mockWebhookServer.waitFor('completed')
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)


    const completedStatus = await completedCallbackRequest
    await mockWebhookServer.close()

    expect(completedStatus).toMatchObject({
      CallSid: expect.any(String),
      AccountSid: expect.any(String),
      From: `sip:${process.env.VOICE_DIAL_FROM_NUMBER}@sip.signalwire.com`,
      To: `verto:${resource}@${process.env.VERTO_DOMAIN};codecs=PCMU,PCMA`,
      CallStatus: 'completed',
      ApiVersion: '2010-04-01',
      Timestamp: expect.any(String),
      CallbackSource: 'call-progress-events',
    })
    console.info('END: ', conferenceWebhookDescription)
  })
})
