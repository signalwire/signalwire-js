import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  randomizeRoomName,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('RoomSession', () => {
  test('should handle Stream events and methods', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })
    const pageThree = await createCustomPage({ name: '[pageThree]' })

    await Promise.all([
      pageOne.goto(SERVER_URL),
      pageTwo.goto(SERVER_URL),
      pageThree.goto(SERVER_URL),
    ])

    const connectionSettings = {
      vrt: {
        room_name: randomizeRoomName('room_session'),
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, connectionSettings),
      createTestRoomSession(pageTwo, connectionSettings),
      createTestRoomSession(pageThree, connectionSettings),
    ])

    // --------------- Promise that resolve on 'stream.started' ---------------
    const pageTwoStreamPromise = pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('stream.started', (stream: any) => resolve(stream))
      })
    })

    // --------------- Joining from the 1st tab and resolve on 'room.joined' ---------------
    const pageOneJoinedPromise = expectRoomJoinedEvent(pageOne, {
      message: 'Waiting for room.joined on pageOne (streaming)',
    })
    await joinRoom(pageOne, { message: 'Joining room on pageOne (streaming)' })
    await pageOneJoinedPromise

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // --------------- Joining from the 2nd tab and resolve on 'room.joined' ---------------
    const pageTwoJoinedPromise = expectRoomJoinedEvent(pageTwo, {
      message: 'Waiting for room.joined on pageTwo (streaming)',
    })
    await joinRoom(pageTwo, { message: 'Joining room on pageTwo (streaming)' })
    await pageTwoJoinedPromise

    const streamingURL = `${process.env.RTMP_SERVER}${process.env.RTMP_STREAM_NAME}`

    // --------------- Start stream from 1st room ---------------
    await pageOne.evaluate(
      async ({ STREAMING_URL }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const streamStarted = new Promise((resolve, reject) => {
          roomObj.on('stream.started', (params) => {
            if (params.state === 'streaming') {
              resolve(true)
            } else {
              reject(new Error('[stream.started] state is not "stream"'))
            }
          })
        })

        await roomObj.startStream({
          url: STREAMING_URL!,
        })

        return streamStarted
      },
      { STREAMING_URL: streamingURL }
    )

    // Checks that the video is visible on pageTwo
    await expectMCUVisible(pageTwo)

    // --------------- Get the active streams from 3rd tab ---------------
    const pageThreeStreamPromise: any = pageThree.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        roomObj.on('room.joined', async (params) => {
          const result = await roomObj.getStreams()

          const streamOnEnd = await Promise.all(
            result.streams.map((stream: any) => {
              const streamEnded = new Promise((resolve) => {
                roomObj.on('stream.ended', (params) => {
                  if (params.id === stream.id) {
                    resolve(params)
                  }
                })
              })

              stream.stop().then(() => {
                console.log(`Stream ${stream.id} stopped!`)
              })

              return streamEnded
            })
          )

          const streamSerializer = (stream: any) => {
            return {
              id: stream.id,
              roomSessionId: stream.roomSessionId,
              state: stream.state,
              url: stream.url,
              stop: stream.stop,
            }
          }

          resolve({
            streamsOnJoined: params.room_session.streams?.map(streamSerializer),
            streamsOnGet: result.streams.map(streamSerializer),
            streamOnEnd: streamOnEnd.map(streamSerializer),
          })
        })
      })
    })

    // --------------- Joining from the 3rd tab and resolve on 'room.joined' ---------------
    const pageThreeJoinedPromise = expectRoomJoinedEvent(pageThree, {
      message: 'Waiting for room.joined on pageThree (streaming)',
    })
    await joinRoom(pageThree, {
      message: 'Joining room on pageThree (streaming)',
    })
    await pageThreeJoinedPromise

    const { streamsOnJoined, streamsOnGet, streamOnEnd } =
      await pageThreeStreamPromise

    expect(streamsOnJoined.length).toEqual(streamsOnGet.length)
    expect(streamsOnGet.length).toEqual(streamOnEnd.length)
    ;[streamsOnJoined, streamsOnGet, streamOnEnd].forEach((streams: any[]) => {
      streams.forEach((stream) => {
        // Since functions can't be serialized back to this
        // thread (from the previous step) we just check that
        // the property is there.
        expect('stop' in stream).toBeTruthy()
        expect(stream.id).toBeDefined()
        expect(stream.roomSessionId).toBeDefined()
        expect(stream.state).toBeDefined()
        expect(stream.url).toEqual(streamingURL)
      })
    })

    // --------------- Make sure pageTwo got the `stream.started` event ---------------
    await pageTwoStreamPromise
  })
})
