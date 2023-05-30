import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  randomizeRoomName,
  createTestVRTToken,
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

    // --------------- Joining from the 2nd tab and resolve on 'stream.started' ---------------
    const pageTwoStreamPromise = pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('stream.started', (stream: any) => resolve(stream))
        roomObj.join()
      })
    })

    // --------------- Joining from the 1st tab and resolve on 'room.joined' ---------------
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

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

    // --------------- Joining from the 3rd tab and get the active streams ---------------
    const { streamsOnJoined, streamsOnGet, streamOnEnd }: any =
      await pageThree.evaluate(() => {
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

            resolve({
              streamsOnJoined: params.room_session.streams,
              streamsOnGet: result.streams,
              streamOnEnd,
            })
          })

          roomObj.join()
        })
      })

    expect(streamsOnJoined.length).toEqual(streamsOnGet.length)
    expect(streamsOnGet.length).toEqual(streamOnEnd.length)
    ;[streamsOnJoined, streamsOnGet, streamsOnGet].forEach((streams: any[]) => {
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

  test('should start the room with user stream', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const vrt = await createTestVRTToken({
      room_name: randomizeRoomName('room_session'),
      user_name: 'e2e_test',
      auto_create_room: true,
      permissions: ['room.stream'],
    })
    if (!vrt) {
      console.error('Invalid VRT. Exiting..')
      process.exit(4)
    }
    await page.evaluate(
      async (options) => {
        // @ts-expect-error
        const Video = window._SWJS.Video

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        const roomSession = new Video.RoomSession({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
          rootElement: document.getElementById('rootElement'),
          logLevel: 'debug',
          debug: {
            logWsTraffic: true,
          },
          localStream: stream,
        })

        // @ts-expect-error
        window._roomObj = roomSession

        return Promise.resolve(roomSession)
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: vrt,
      }
    )

    const { localVideoTrack, localAudioTrack } = await page.evaluate(
      async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const room = await roomObj.join()

        return {
          localVideoTrack: room.localVideoTrack,
          localAudioTrack: room.localAudioTrack,
        }
      }
    )

    expect(localAudioTrack).toBeDefined()
    expect(localVideoTrack).toBeNull()
  })

  test('should set the stream on the fly', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const connectionSettings = {
      vrt: {
        room_name: randomizeRoomName('room_session'),
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
    }

    await createTestRoomSession(page, connectionSettings)

    const { localVideoTrackLength, localAudioTrackLength } =
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const stream1 = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
        const stream2 = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })
        stream2.getAudioTracks().forEach((track) => stream1.addTrack(track))

        const room = await roomObj.join()

        // Set new stream with 1 video and 2 audio tracks
        room.setLocalStream(stream1)

        return {
          localVideoTrackLength: room.localStream?.getVideoTracks(),
          localAudioTrackLength: room.localStream?.getAudioTracks(),
        }
      })

    expect(localVideoTrackLength).toHaveLength(1)
    expect(localAudioTrackLength).toHaveLength(2)
  })
})
