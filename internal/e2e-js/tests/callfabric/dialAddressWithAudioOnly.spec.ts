import { Video } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectMCUVisible,
  getAudioStats,
  getStats,
} from '../../utils'

test.describe('Dial address with audio channel only', () => {
  test('should handle joining a room with audio channel only', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = 'cf-e2e-test-room'

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}?channel=audio`,
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

    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.outboundRTP).not.toHaveProperty('video')
    
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === true
            ) {
              resolve(true)
            }
          })
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.audioMute()
        await roomObj.audioUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { roomSession }
    )
  })

})
