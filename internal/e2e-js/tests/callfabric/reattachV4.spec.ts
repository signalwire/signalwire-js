import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  createTestSATToken,
  dialAddress,
  expectMCUVisible,
} from '../../utils'
import {
  FabricRoomSession,
  SignalWireClient,
  SignalWireContract,
} from '@signalwire/js'

test.describe('Reattach with v4 Client', () => {
  test('it should reattach the call', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-reattach-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client: true })

    // Dial an address and join a video room
    const roomSessionBeforeReattach = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSessionBeforeReattach.room_session).toBeDefined()

    await expectMCUVisible(page)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page, { useV4Client: true })

    // Reattach to the previous call session
    const roomSessionAfterReattach = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          const call = await client.reattach({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call
          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSessionAfterReattach.call_id).toEqual(
      roomSessionBeforeReattach.call_id
    )
  })

  test('it should not reattach if the authState is not provided', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-reattach-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client: true })

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page, { useV4Client: true, useAuthState: false })

    // Reattach to the previous call session
    const reattachError = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          try {
            const call = await client.reattach({
              to: `/public/${roomName}?channel=video`,
              rootElement: document.getElementById('rootElement'),
            })
            call.on('call.joined', reject)

            // @ts-expect-error
            window._roomObj = call
            await call.start()
          } catch (e) {
            resolve(e)
          }
        })
      },
      { roomName }
    )

    expect(reattachError).toBeDefined()
    expect(reattachError).toBeInstanceOf(Error)
  })

  test('it should reattach with previous room states', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-reattach-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client: true })

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberVideoMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.videoMuted', (params) => {
            if (
              params.member.member_id === roomSession.member_id &&
              params.member.video_muted === true
            ) {
              res(true)
            }
          })
        })

        await roomObj.videoMute()
        await memberVideoMutedEvent
      },
      { roomSession }
    )

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberAudioMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.audioMuted', (params) => {
            if (
              params.member.member_id === roomSession.member_id &&
              params.member.audio_muted === true
            ) {
              res(true)
            }
          })
        })

        await roomObj.audioMute()
        await memberAudioMutedEvent
      },
      { roomSession }
    )

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page, { useV4Client: true })

    // Reattach to the previous call session
    const roomSessionAfterReattach = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          const call = await client.reattach({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call
          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSessionAfterReattach.call_id).toEqual(roomSession.call_id)

    const localVideoTrack = await page.evaluate(
      // @ts-expect-error
      () => window._roomObj.peer.localVideoTrack
    )
    expect(localVideoTrack).toEqual({})

    const localAudioTrack = await page.evaluate(
      // @ts-expect-error
      () => window._roomObj.peer.localAudioTrack
    )
    expect(localAudioTrack).toEqual({})
  })

  // TODO: Unskip this test once the following issue is resolved:
  // https://github.com/signalwire/cloud-product/issues/14179
  test.skip('it should not reattach with invalid authState', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-reattach-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client: true })

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    await page.reload({ waitUntil: 'domcontentloaded' })

    // Create a client with invalid auth state
    const sat = await createTestSATToken()
    await page.evaluate(
      async (options) => {
        // Get, decode, and use the previous call protocol and ID
        const authStateFromStorage = sessionStorage.getItem(
          'authState'
        ) as string
        const decodedAuthState = window.atob(authStateFromStorage)
        const prevAuthState = JSON.parse(decodedAuthState)

        const json = JSON.stringify({
          authState: 'wrong auth state',
          protocol: prevAuthState.protocol,
          callId: prevAuthState.callId,
        })
        const authState = window.btoa(json)

        const SignalWire = window._SWJS.SignalWireV4
        const client: SignalWireContract = await SignalWire({
          host: options.RELAY_HOST,
          token: options.TOKEN,
          debug: { logWsTraffic: true },
          maxApiRequestRetries: 0,
          onAuthStateChange: (state) => {
            sessionStorage.setItem('authState', state)
          },
          authState,
        })

        window._client = client
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        TOKEN: sat,
      }
    )

    // Reattach to the previous call session
    const reattachError = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          try {
            const call = await client.reattach({
              to: `/public/${roomName}?channel=video`,
              rootElement: document.getElementById('rootElement'),
            })
            call.on('call.joined', reject)

            // @ts-expect-error
            window._roomObj = call
            await call.start()
          } catch (e) {
            resolve(e)
          }
        })
      },
      { roomName }
    )

    expect(reattachError).toBeDefined()
    expect(reattachError).toBeInstanceOf(Error)
  })
})
