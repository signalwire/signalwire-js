import type { Video } from '@signalwire/js'
import type { MediaEvent } from '@signalwire/webrtc'
import { createServer } from 'vite'
import path from 'path'
import { Page, expect } from '@playwright/test'
import fetch from 'node-fetch'
import { v4 as uuid } from 'uuid'

type CreateTestServerOptions = {
  target: 'heroku' | 'blank'
}

const TARGET_ROOT_PATH: Record<
  CreateTestServerOptions['target'],
  {
    path: string
    port: number
  }
> = {
  blank: { path: './templates/blank', port: 1337 },
  heroku: {
    path: path.dirname(
      require.resolve('@sw-internal/playground-js/src/heroku/index.html')
    ),
    port: 1336,
  },
}

export const SERVER_URL = 'http://localhost:1337'
export const BASIC_TOKEN = Buffer.from(
  `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
).toString('base64')

export const createTestServer = async (
  options: CreateTestServerOptions = { target: 'blank' }
) => {
  const targetOptions = TARGET_ROOT_PATH[options.target]
  const server = await createServer({
    configFile: false,
    root: targetOptions.path,
    server: {
      port: targetOptions.port,
    },
    logLevel: 'silent',
  })

  return {
    start: async () => {
      await server.listen()
    },
    close: async () => {
      await server.close()
    },
    url: `http://localhost:${targetOptions.port}`,
  }
}

export const createTestRoomSession = async (
  page: Page,
  options: {
    vrt: CreateTestVRTOptions
    /** set of events to automatically subscribe before room.join() */
    initialEvents?: string[]
    expectToJoin?: boolean
    roomSessionOptions?: Record<string, any>
  }
) => {
  const vrt = await createTestVRTToken(options.vrt)
  if (!vrt) {
    console.error('Invalid VRT. Exiting..')
    process.exit(4)
  }
  const roomSession: Video.RoomSession = await page.evaluate(
    (options) => {
      // @ts-expect-error
      const Video = window._SWJS.Video
      const roomSession = new Video.RoomSession({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        rootElement: document.getElementById('rootElement'),
        // logLevel: options.CI ? 'info' : 'debug',
        // logLevel: 'debug',
        debug: {
          // logWsTraffic: !options.CI,
          logWsTraffic: false,
        },
        ...options.roomSessionOptions,
      })

      options.initialEvents?.forEach((event) => {
        roomSession.once(event, () => {})
      })

      // @ts-expect-error
      window.jwt_token = options.API_TOKEN

      // @ts-expect-error
      window._roomObj = roomSession

      return Promise.resolve(roomSession)
    },
    {
      RELAY_HOST:
        options.vrt.join_as === 'audience'
          ? process.env.RELAY_AUDIENCE_HOST
          : process.env.RELAY_HOST,
      API_TOKEN: vrt,
      initialEvents: options.initialEvents,
      CI: process.env.CI,
      roomSessionOptions: options.roomSessionOptions,
    }
  )

  if (options.expectToJoin !== false) {
    expectRoomJoined(page, { invokeJoin: false }).then(async (params) => {
      await expectMemberId(page, params.member_id)

      const dir = options.vrt.join_as === 'audience' ? 'recvonly' : 'sendrecv'
      await expectSDPDirection(page, dir, true)

      const mode = options.vrt.join_as === 'audience' ? 'audience' : 'member'
      await expectInteractivityMode(page, mode)
    })
  }

  return roomSession
}

export const createTestRoomSessionWithJWT = async (
  page: Page,
  options: {
    vrt: CreateTestVRTOptions
    /** set of events to automatically subscribe before room.join() */
    initialEvents?: string[]
    roomSessionOptions?: Record<string, any>
  },
  jwt: string
) => {
  if (!jwt) {
    console.error('Invalid JWT. Exiting..')
    process.exit(4)
  }
  return page.evaluate(
    (options) => {
      // @ts-expect-error
      const Video = window._SWJS.Video
      const roomSession = new Video.RoomSession({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        rootElement: document.getElementById('rootElement'),
        audio: true,
        video: true,
        logLevel: options.CI ? 'warn' : 'debug',
        debug: {
          logWsTraffic: !options.CI,
        },
        ...options.roomSessionOptions,
      })

      options.initialEvents?.forEach((event) => {
        roomSession.once(event, () => {})
      })

      // @ts-expect-error
      window.jwt_token = options.API_TOKEN

      // @ts-expect-error
      window._roomObj = roomSession

      return Promise.resolve(roomSession)
    },
    {
      RELAY_HOST:
        options.vrt.join_as === 'audience'
          ? process.env.RELAY_AUDIENCE_HOST
          : process.env.RELAY_HOST,
      API_TOKEN: jwt,
      initialEvents: options.initialEvents,
      CI: process.env.CI,
      roomSessionOptions: options.roomSessionOptions,
    }
  )
}

interface CreateTestVRTOptions {
  room_name: string
  user_name: string
  room_display_name?: string
  permissions?: string[]
  join_from?: number | string
  join_until?: number | string
  remove_at?: number | string
  remove_after_seconds_elapsed?: number
  auto_create_room?: boolean
  join_as?: 'member' | 'audience'
  media_allowed?: 'audio-only' | 'video-only' | 'all'
  join_audio_muted?: boolean
  join_video_muted?: boolean
  end_room_session_on_leave?: boolean
}

export const createTestVRTToken = async (body: CreateTestVRTOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/room_tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

interface CreateTestCRTOptions {
  ttl: number
  member_id: string
  state: Record<string, any>
  channels: Record<string, { read?: boolean; write?: boolean }>
}

export const createTestCRTToken = async (body: CreateTestCRTOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/chat/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

export const enablePageLogs = (page: Page, customMsg: string = '[page]') => {
  page.on('console', (log) => console.log(customMsg, log))
}

export const expectSDPDirection = async (
  page: Page,
  direction: string,
  value: boolean
) => {
  const peerSDP = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    // @ts-expect-error
    return roomObj.peer.localSdp
  })

  expect(peerSDP.split('m=')[1].includes(direction)).toBe(value)
  expect(peerSDP.split('m=')[2].includes(direction)).toBe(value)
}

export const expectInteractivityMode = async (
  page: Page,
  mode: 'member' | 'audience'
) => {
  const interactivityMode = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    return roomObj.interactivityMode
  })

  expect(interactivityMode).toEqual(mode)
}

export const expectLayoutChanged = (page: Page, layoutName: string) => {
  return page.evaluate(
    (options) => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('layout.changed', ({ layout }: any) => {
          if (layout.name === options.layoutName) {
            resolve(true)
          }
        })
      })
    },
    { layoutName }
  )
}

export const setLayoutOnPage = (page: Page, layoutName: string) => {
  return page.evaluate(
    async (options) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return await roomObj.setLayout({ name: options.layoutName })
    },
    { layoutName }
  )
}

export const expectRoomJoined = (
  page: Page,
  options: { invokeJoin: boolean } = { invokeJoin: true }
) => {
  return page.evaluate(({ invokeJoin }) => {
    return new Promise<any>(async (resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      roomObj.once('room.joined', resolve)

      if (invokeJoin) {
        await roomObj.join()
      }
    })
  }, options)
}

export const expectMCUVisible = async (page: Page) => {
  await page.waitForSelector('div[id^="sw-sdk-"] > video')
}

export const expectMCUVisibleForAudience = async (page: Page) => {
  await page.waitForSelector('#rootElement video')
}

export const randomizeRoomName = (prefix: string = 'e2e') => {
  return `${prefix}${uuid()}`
}

export const expectMemberId = async (page: Page, memberId: string) => {
  const roomMemberId = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    return roomObj.memberId
  })

  expect(roomMemberId).toEqual(memberId)
}

export const expectMemberTalkingEvent = (page: Page) => {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      roomObj.on('member.talking', resolve)
    })
  })
}

export const expectMediaEvent = (page: Page, event: MediaEvent) => {
  return page.evaluate(
    ({ event }) => {
      return new Promise<void>((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on(event, resolve)
      })
    },
    { event }
  )
}

export const expectTotalAudioEnergyToBeGreaterThan = async (
  page: Page,
  value: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj

    // @ts-expect-error
    const audioTrackId = roomObj.peer._getReceiverByKind('audio').track.id

    // @ts-expect-error
    const stats = await roomObj.peer.instance.getStats(null)
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

const getRoomByName = async (roomName: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${roomName}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
    }
  )
  if (response.status === 200) {
    return await response.json()
  }
  return undefined
}

export interface CreateOrUpdateRoomOptions {
  name: string
  display_name?: string
  max_members?: number
  quality?: '720p' | '1080p'
  join_from?: string
  join_until?: string
  remove_at?: string
  remove_after_seconds_elapsed?: number
  layout?: string
  record_on_start?: boolean
  enable_room_previews?: boolean
}

export const createOrUpdateRoom = async (body: CreateOrUpdateRoomOptions) => {
  const room = await getRoomByName(body.name)
  if (!room) {
    return createRoom(body)
  }

  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${room.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  return response.json()
}

export const createRoom = async (body: CreateOrUpdateRoomOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  return response.json()
}

export const createStreamForRoom = async (name: string, url: string) => {
  const room = await getRoomByName(name)
  if (!room) {
    throw new Error('Room not found')
  }

  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${room.id}/streams`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({ url }),
    }
  )
  const data = await response.json()
  if (response.status !== 201) {
    throw data
  }

  // console.log('Room Data', data)
  return data
}

export const deleteRoom = async (id: string) => {
  return await fetch(`https://${process.env.API_HOST}/api/video/rooms/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${BASIC_TOKEN}`,
    },
  })
}

export const expectPageReceiveAudio = async (page: Page) => {
  await page.waitForTimeout(10000)
  await expectTotalAudioEnergyToBeGreaterThan(page, 0.5)
}

export const getRemoteMediaIP = async (page: Page) => {
  const remoteIP: string = await page.evaluate(() => {
    // @ts-expect-error
    const peer: Video.RoomSessionPeer = window._roomObj.peer
    const lines = peer.instance?.remoteDescription?.sdp?.split('\r\n')
    const ipLine = lines?.find((line: any) => line.includes('c=IN IP4'))
    return ipLine?.split(' ')[2]
  })
  return remoteIP
}

export const expectScreenShareJoined = async (page: Page) => {
  return page.evaluate(() => {
    return new Promise<any>(async (resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      roomObj.on('member.joined', (params: any) => {
        if (params.member.type === 'screen') {
          resolve(true)
        }
      })

      await roomObj.startScreenShare({
        audio: true,
        video: true,
      })
    })
  })
}

export const getStats = async (page: Page) => {
  const stats = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    // @ts-expect-error
    const rtcPeer = roomObj.peer
    const stats = await rtcPeer.instance.getStats(null)
    const result: {
      inboundRTP: Record<any, any>
      outboundRTP: Record<any, any>
    } = { inboundRTP: {}, outboundRTP: {} }

    const inboundRTPFilters = {
      audio: ['packetsReceived', 'packetsLost', 'packetsDiscarded'],
      video: ['packetsReceived', 'packetsLost', 'packetsDiscarded'],
    } as const

    const inboundRTPHandler = (report: any) => {
      const media = report.mediaType as 'video' | 'audio'
      const trackId = rtcPeer._getReceiverByKind(media).track.id
      console.log(`getStats trackId "${trackId}" for media ${media}`)
      if (report.trackIdentifier !== trackId) {
        console.log(
          `trackIdentifier "${report.trackIdentifier}" and trackId "${trackId}" are different`
        )
        return
      }
      result.inboundRTP[media] = result.inboundRTP[media] || {}
      inboundRTPFilters[media].forEach((key) => {
        result.inboundRTP[media][key] = report[key]
      })
    }

    const outboundRTPFilters = {
      audio: ['active', 'packetsSent', 'targetBitrate', 'totalPacketSendDelay'],
      video: ['active', 'packetsSent', 'targetBitrate', 'totalPacketSendDelay'],
    } as const

    const outboundRTPHandler = (report: any) => {
      const media = report.mediaType as 'video' | 'audio'
      result.outboundRTP[media] = result.outboundRTP[media] || {}
      outboundRTPFilters[media].forEach((key) => {
        result.outboundRTP[media][key] = report[key]
      })
    }

    stats.forEach((report: any) => {
      switch (report.type) {
        case 'inbound-rtp':
          inboundRTPHandler(report)
          break
        case 'outbound-rtp':
          outboundRTPHandler(report)
          break
      }
    })

    return result
  })
  console.log('RTC Stats', stats)

  return stats
}

export const expectPageReceiveMedia = async (page: Page, delay = 5_000) => {
  const first = await getStats(page)
  await page.waitForTimeout(delay)
  const last = await getStats(page)

  const seconds = delay / 1000
  const minAudioPacketsExpected = 40 * seconds
  const minVideoPacketsExpected = 25 * seconds

  expect(last.inboundRTP.video.packetsReceived).toBeGreaterThan(
    first.inboundRTP.video.packetsReceived + minVideoPacketsExpected
  )
  expect(last.inboundRTP.audio.packetsReceived).toBeGreaterThan(
    first.inboundRTP.audio.packetsReceived + minAudioPacketsExpected
  )
}
