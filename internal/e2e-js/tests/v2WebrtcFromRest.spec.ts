import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createRestApiCall,
  createTestJWTToken,
} from '../utils'
	      
test.describe('V2Calling', () => {
  test('should handle one v2 webrtc endpoint connecting, receiving a call from a REST API Create Call request, answering and being connected to a Laml bin', async ({
    createCustomVanillaPage,
  }) => {
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

    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    // TODO: Consider randomizing the resource
    const jwtCallee = await createTestJWTToken({ 'resource': 'gino' })
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

    await expectRelayConnected(pageCallee, jwtCallee)

    console.log("_______callee is now connected _______ creating call")

    const createResult = await createRestApiCall('gino')
    console.log("_________createResult: ",createResult)

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)

    // TODO: Maybe set a reasonable timeout for this expectation (default is 10 secs)
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

    // Give some time to collect audio
    await pageCallee.waitForTimeout(10000)

    // Check the audio energy level is above threshold
    await expectTotalAudioEnergyToBeGreaterThan(pageCallee, 0.4)

    // Click the callee hangup button, which calls the hangup function in the browser
    await pageCallee.click('#hangupCall')

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    await expectCallHangup(pageCallee)
  })
})
