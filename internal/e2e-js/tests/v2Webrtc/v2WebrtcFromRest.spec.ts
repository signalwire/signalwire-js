import { expect, Page, test } from '../../fixtures'

import {
  SERVER_URL,
  createCallWithCompatibilityApi,
  createTestJWTToken,
  expectInjectRelayHost,
  expectRelayConnected,
  expectv2TotalAudioEnergyToBeGreaterThan,
  randomizeResourceName,
  randomizeRoomName,
} from '../../utils'

test.describe('v2WebrtcFromRest', () => {
  test('should handle a call from LaML bin', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from LaML bin')

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

    const conferenceName = randomizeRoomName('v2rest')
    const conferenceRegion = process.env.LAML_CONFERENCE_REGION ?? ''
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Conference
            endConferenceOnExit="false"
            startConferenceOnEnter="true"
            waitUrl="https://cdn.signalwire.com/default-music/welcome.mp3"
            waitMethod="GET"
            ${conferenceRegion}>
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>`

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
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, minAudioEnergy)

    await expectCallActive(pageCallee)
    console.log('Hanging up the call at ', new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    console.info('END: should handle a call from LaML bin')
  })
})

test.describe('v2WebrtcFromRestTwoJoinAudioVideo', () => {
  test('should handle a call from LaML bin and make 2 users join a room, audio/video', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from LaML bin and make 2 users join a room, audio/video')

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

    const conferenceName = randomizeRoomName('v2rest')
    const conferenceRegion = process.env.LAML_CONFERENCE_REGION ?? ''
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Conference
            endConferenceOnExit="false"
            startConferenceOnEnter="true"
            waitUrl="https://cdn.signalwire.com/default-music/welcome.mp3"
            waitMethod="GET"
            ${conferenceRegion}>
            ${conferenceName}
          </Conference>
        </Dial>
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
    const minAudioEnergy = callDurationMs / 50000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, minAudioEnergy)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee2, minAudioEnergy)

    await expectCallActive(pageCallee)
    await expectCallActive(pageCallee2)

    console.log('Hanging up the call2 at ', new Date())

    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    await pageCallee2.click('#hangupCall')
    await expectCallHangup(pageCallee2)

    console.info('END: should handle a call from LaML bin and make 2 users join a room, audio/video')
  })
})

test.describe('v2WebrtcFromRestTwoJoinAudio', () => {
  test('should handle a call from LaML bin and make 2 users join a room, audio G711', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle a call from LaML bin and make 2 users join a room, audio G711')

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

    const conferenceName = randomizeRoomName('v2rest')
    const conferenceRegion = process.env.LAML_CONFERENCE_REGION ?? ''
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Conference
            endConferenceOnExit="false"
            startConferenceOnEnter="true"
            waitUrl="https://cdn.signalwire.com/default-music/welcome.mp3"
            waitMethod="GET"
            ${conferenceRegion}>
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>`

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
    const minAudioEnergy = callDurationMs / 50000

    // Check the audio energy level is above threshold
    console.log('Expected min audio energy: ', minAudioEnergy)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, minAudioEnergy)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee2, minAudioEnergy)

    await expectCallActive(pageCallee)
    await expectCallActive(pageCallee2)

    console.log('Hanging up the call2 at ', new Date())

    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)

    await pageCallee2.click('#hangupCall')
    await expectCallHangup(pageCallee2)

    console.info('END: should handle a call from LaML bin and make 2 users join a room, audio G711')
  })
})