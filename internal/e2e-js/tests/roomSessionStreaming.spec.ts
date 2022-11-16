import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { SERVER_URL, createTestRoomSession } from '../utils'

test.describe('RoomSession', () => {
  test('should handle Stream events and methods', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    const pageThree = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))
    pageTwo.on('console', (log) => console.log('[pageTwo]', log))
    pageThree.on('console', (log) => console.log('[pageThree]', log))

    await Promise.all([
      pageOne.goto(SERVER_URL),
      pageTwo.goto(SERVER_URL),
      pageThree.goto(SERVER_URL),
    ])

    const connectionSettings = {
      vrt: {
        room_name: 'another',
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
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

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
      { STREAMING_URL: process.env.STREAMING_URL }
    )

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

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
        expect(stream.url).toEqual(process.env.STREAMING_URL)
      })
    })

    // --------------- Make sure pageTwo got the `stream.started` event ---------------
    await pageTwoStreamPromise

    await new Promise((r) => setTimeout(r, 1000))

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      // @ts-expect-error
      pageOne.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageTwo.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageThree.evaluate(() => window._roomObj.leave()),
    ])
  })
})
