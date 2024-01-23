import {
  expect,
  Page,
  test
} from '../../fixtures'

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

test.describe('V2Calling incoming from REST API', () => {
  test('should handle one v2 webrtc endpoint connecting, receiving a call from a REST API Create Call request, answering and being connected to a Laml bin', async ({
    createCustomVanillaPage,
  }) => {
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
    const jwtCallee = await createTestJWTToken({ 'resource': resource })
    expect(jwtCallee).not.toBe(null)

    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)

    const conferenceName = randomizeRoomName("v2rest")
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

    console.log("inline Laml: ", inlineLaml)
    const createResult = await createCallWithCompatibilityApi(resource, inlineLaml)
    expect(createResult).toBe(201)
    console.log("REST API returned 201 at ", new Date())

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    console.log("The call is active at ", new Date())

    const callDurationMs = 20000
    // Call duration
    await pageCallee.waitForTimeout(callDurationMs)

    console.log("Time to check the audio energy at ", new Date())

    // Empirical value; it depends on the call scenario
    const minAudioEnergy = callDurationMs / 50000

    // Check the audio energy level is above threshold
    console.log("Expected min audio energy: ", minAudioEnergy)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, minAudioEnergy)

    await expectCallActive(pageCallee)
    console.log("Hanging up the call at ", new Date())
    await pageCallee.click('#hangupCall')
    await expectCallHangup(pageCallee)
  })
})
