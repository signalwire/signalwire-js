import { uuid } from '@signalwire/core'
import { Video } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectLayoutChanged,
  expectMCUVisible,
  getStats,
  setLayoutOnPage,
} from '../../utils'
import { Call } from 'packages/realtime-api/dist/realtime-api/src/voice/Voice'
import { callFabricWorker } from 'packages/js/src/fabric/workers'

test.describe('CallFabric Renegotiation', () => {

  test('should handle joining a room with audio channel only', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}?channel=audio`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('room.joined', resolve)
          call.on('room.updated', () => {})

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    const stats = await getStats(page)

    // expect(stats.outboundRTP).not.toHaveProperty('video')

    // expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
        window._roomObj.
    });
  })
})
