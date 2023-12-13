import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createTestJWTToken,
} from '../utils'
	      
test.describe('V2Calling', () => {
  test('should handle one webrtc endpoint calling to a second webrtc endpoint waiting to answer', async ({
    createCustomVanillaPage,
  }) => {
    const pageCaller = await createCustomVanillaPage({ name: '[caller]' })
    await pageCaller.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    const expectInjectRelayHost = async (page: Page, host: string) => {
      await page.evaluate(async (params) => {
        // @ts-expect-error
        window.__host = params.host
      },
      {
        host: host
      })
    }

    await expectInjectRelayHost(pageCaller, relayHost)
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const jwtCaller = await createTestJWTToken({ 'resource': 'vanilla-caller' })
    expect(jwtCaller).not.toBe(null)

    const jwtCallee = await createTestJWTToken({ 'resource': 'vanilla-callee' })
    expect(jwtCallee).not.toBe(null)

    const expectRelayConnected = async (page: Page, jwt: string) => {
      // Project locator
      const project = page.locator('#project')
      expect(project).not.toBe(null)

      // Token locator
      const token = page.locator('#token')
      expect(token).not.toBe(null)

      // Populate project and token using locators
      await project.fill(envRelayProject)
      await token.fill(jwt)

      // Click the connect button, which calls the connect function in the browser
      await page.click('#btnConnect')

      // Start call button locator
      const startCall = page.locator('#startCall')
      expect(startCall).not.toBe(null)

      // Wait for call button to be enabled when signalwire.ready occurs
      await expect(startCall).toBeEnabled()
    }

    // Wait for both caller and callee to get connected to Relay
    await expectRelayConnected(pageCaller, jwtCaller)
    await expectRelayConnected(pageCallee, jwtCallee)

    const expectCallStarted = async (page: Page, to: string, from: string) => {
      // To Number locator
      const number = page.locator('#number')
      expect(number).not.toBe(null)

      // From Number locator
      const numberFrom = page.locator('#numberFrom')
      expect(numberFrom).not.toBe(null)

      // Populate to and from numbers
      await number.fill(to)
      await numberFrom.fill(from)

      // Click the call button, which calls the makeCall function in the browser
      await page.click('#startCall')

      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for hangup button to be enabled when call update trying or active occurs
      await expect(hangupCall).toBeEnabled()
    }

    // Wait for caller to start the call
    await expectCallStarted(pageCaller, 'vanilla-callee', 'vanilla-caller')

    // Call status locators
    const callStatusCaller = pageCaller.locator('#callStatus')
    expect(callStatusCaller).not.toBe(null)

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    
    // Wait for call to be active on both caller and callee
    await expect(callStatusCaller).toContainText('-> active')
    await expect(callStatusCallee).toContainText('-> active')


    // Additional activity while call is up can go here
    const expectVideoMediaStreams = async (page: Page) => {
      const result = await page.evaluate(() => {
        return {
          // @ts-expect-error
          localVideo: document.getElementById('localVideo').srcObject instanceof MediaStream,
          // @ts-expect-error
          remoteVideo: document.getElementById('remoteVideo').srcObject instanceof MediaStream
        }
      })

      expect(result.localVideo).toBe(true)
      expect(result.remoteVideo).toBe(true)
    }

    await expectVideoMediaStreams(pageCaller)
    await expectVideoMediaStreams(pageCallee)

    const expectTotalAudioEnergyToBeGreaterThan = async (
      page: Page,
      value: number
    ) => {
      const audioStats = await page.evaluate(async () => {
        // @ts-expect-error
        const currentCall = window.__currentCall
        // @ts-expect-error
        const audioReceiver = currentCall.peer.instance.getReceivers().find(r => r.track.kind === 'audio')

        const audioTrackId = audioReceiver.track.id
    
        const stats = await currentCall.peer.instance.getStats(null)
        const filter = {
          'inbound-rtp': [
            'audioLevel',
            'totalAudioEnergy',
            'totalSamplesDuration',
            'totalSamplesReceived',
            'packetsDiscarded',
            'lastPacketReceivedTimestamp',
            'bytesReceived',
            'packetsReceived',
            'packetsLost',
            'packetsRetransmitted',
          ],
        }
        const result: any = {}
        Object.keys(filter).forEach((entry) => {
          result[entry] = {}
        })
    
        stats.forEach((report: any) => {
          for (const [key, value] of Object.entries(filter)) {
            if (
              report.type == key &&
              report['mediaType'] === 'audio' &&
              report['trackIdentifier'] === audioTrackId
            ) {
              value.forEach((entry) => {
                if (report[entry]) {
                  result[key][entry] = report[entry]
                }
              })
            }
          }
        }, {})
    
        return result
      })
      console.log('audioStats', audioStats)
    
      expect(audioStats['inbound-rtp']['totalAudioEnergy']).toBeGreaterThan(value)
    }

    // Give some time to collect audio from both pages
    await pageCaller.waitForTimeout(10000)

    // Check the audio energy level is above threshold
    await expectTotalAudioEnergyToBeGreaterThan(pageCaller, 0.4)
    await expectTotalAudioEnergyToBeGreaterThan(pageCallee, 0.4)


    // Click the caller hangup button, which calls the hangup function in the browser
    await pageCaller.click('#hangupCall')

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    // Wait for both caller and callee to hangup
    await expectCallHangup(pageCaller)
    await expectCallHangup(pageCallee)
  })
})