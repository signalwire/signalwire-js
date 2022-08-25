import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should handle streaming events and methods', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    const pageThree = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))
    pageTwo.on('console', (log) => console.log('[pageTwo]', log))
    pageThree.on('console', (log) => console.log('[pageThree]', log))

    await Promise.all([
      pageOne.goto(server.url),
      pageTwo.goto(server.url),
      pageThree.goto(server.url),
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
    const pageTwoStreamingPromise = pageTwo.evaluate(() => {
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

    // --------------- Start streaming from 1st room ---------------
    await pageOne.evaluate(
      async ({ STREAMING_URL }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const streamingStarted = new Promise((resolve, reject) => {
          roomObj.on('stream.started', (params) => {
            if (params.state === 'streaming') {
              resolve(true)
            } else {
              reject(new Error('[stream.started] state is not "streaming"'))
            }
          })
        })

        await roomObj.startStreaming({
          url: STREAMING_URL!,
        })

        return streamingStarted
      },
      { STREAMING_URL: process.env.STREAMING_URL }
    )

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Joining from the 3rd tab and get the active streamings ---------------
    const { streamingsOnJoined, streamingsOnGet, streamingOnEnd }: any =
      await pageThree.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj

          roomObj.on('room.joined', async (params) => {
            const result = await roomObj.getStreamings()

            const streamingOnEnd = await Promise.all(
              result.streams.map((streaming: any) => {
                const streamingEnded = new Promise((resolve) => {
                  roomObj.on('stream.ended', (params) => {
                    if (params.id === streaming.id) {
                      resolve(params)
                    }
                  })
                })

                streaming.stop().then(() => {
                  console.log(`Streaming ${streaming.id} stopped!`)
                })

                return streamingEnded
              })
            )

            resolve({
              streamingsOnJoined: params.room_session.streams,
              streamingsOnGet: result.streams,
              streamingOnEnd,
            })
          })

          roomObj.join()
        })
      })

    expect(streamingsOnJoined.length).toEqual(streamingsOnGet.length)
    expect(streamingsOnGet.length).toEqual(streamingOnEnd.length)
    ;[streamingsOnJoined, streamingsOnGet, streamingsOnGet].forEach(
      (streamings: any[]) => {
        streamings.forEach((streaming) => {
          // Since functions can't be serialized back to this
          // thread (from the previous step) we just check that
          // the property is there.
          expect('stop' in streaming).toBeTruthy()
          expect(streaming.id).toBeDefined()
          expect(streaming.roomSessionId).toBeDefined()
          expect(streaming.state).toBeDefined()
          expect(streaming.url).toEqual(process.env.STREAMING_URL)
        })
      }
    )

    // --------------- Make sure pageTwo got the `stream.started` event ---------------
    await pageTwoStreamingPromise

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
