import type {
  DialParams,
  CallSession,
  SignalWire,
  SignalWireClient,
  SignalWireContract,
} from '@signalwire/client'
import type { MediaEventNames } from '@signalwire/webrtc'
import { createServer } from 'vite'
import path from 'path'
import { expect } from './fixtures'
import type { Page, TestInfo } from '@playwright/test'
import type { PageFunction } from 'playwright-core/types/structs'
import { v4 as uuid } from 'uuid'
import express, { Express, Request, Response } from 'express'
import { TestContext, SDKEvent, EventStats } from './TestContext'
import { Server } from 'http'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'
declare global {
  interface Window {
    _SWJS: {
      SignalWire: typeof SignalWire
    }
    _client?: SignalWireClient
    _callObj?: CallSession
  }
}

// #region Utilities for Playwright test server & fixture

type CreateTestServerOptions = {
  target: 'blank'
}

const TARGET_ROOT_PATH: Record<
  CreateTestServerOptions['target'],
  {
    path: string
    port: number
  }
> = {
  blank: { path: './templates/blank', port: 1337 },
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
    resolve: {
      alias: {
        '@signalwire/client': path.resolve(
          __dirname,
          '../../packages/client/src'
        ),
        '@signalwire/core': path.resolve(__dirname, '../../packages/core/src'),
        '@signalwire/webrtc': path.resolve(
          __dirname,
          '../../packages/webrtc/src'
        ),
        '@signalwire/js': path.resolve(__dirname, '../../packages/js/src'),
      },
    },
    optimizeDeps: {
      include: ['@signalwire/client', '@signalwire/core', '@signalwire/webrtc'],
    },
    define: {
      'process.env': '{}',
      process: '{}',
    },
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

export const enablePageLogs = (page: Page, customMsg: string = '[page]') => {
  page.on('console', (log) => console.log(customMsg, log))
}

// #endregion

// #region Utilities for Token Creation

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

// TODO: This is not used anywhere, remove it?
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

interface CreateTestJWTOptions {
  resource?: string
  refresh_token?: string
}

// TODO: This is not used anywhere, remove it?
export const createTestJWTToken = async (body: CreateTestJWTOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/relay/rest/jwt`,
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
  return data.jwt_token
}

export const createTestSATToken = async (reference?: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/subscribers/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        reference: reference || process.env.SAT_REFERENCE,
      }),
    }
  )
  const data = (await response.json()) as {
    token: string
  }
  return data.token
}

interface GuestSATTokenRequest {
  allowed_addresses: string[]
}
export const createGuestSATToken = async (bodyData: GuestSATTokenRequest) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/guests/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(bodyData),
    }
  )
  const data = await response.json()
  return data.token
}

export const getResourceAddresses = async (resource_id: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/${resource_id}/addresses`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
    }
  )
  const data = await response.json()
  return data
}

interface CreateTestCRTOptions {
  ttl: number
  member_id: string
  state: Record<string, any>
  channels: Record<string, { read?: boolean; write?: boolean }>
}

// TODO: This is not used anywhere, remove it?
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

// #endregion

// #region Utilities for RoomSession

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

// TODO: This is not used anywhere, remove it?
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

  return data
}

// TODO: This is not used anywhere, remove it?
export const deleteRoom = async (id: string) => {
  return await fetch(`https://${process.env.API_HOST}/api/video/rooms/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${BASIC_TOKEN}`,
    },
  })
}

export const leaveRoom = async (page: Page) => {
  return page.evaluate(async () => {
    const callObj = window._callObj

    if (callObj && callObj?.roomSessionId) {
      console.log('Fixture has room', callObj.roomSessionId)
      await callObj.leave()
    }

    return {
      videos: Array.from(document.querySelectorAll('video')).length,
      rootEl: document.getElementById('rootElement')?.childElementCount ?? 0,
    }
  })
}

// #endregion

// #region Utilities for Call Call client

interface CreateCFClientParams {
  attachSagaMonitor?: boolean
  reference?: string
}

// Helper function to set up WebSocket monitoring for TestContext
export const setupWebSocketMonitoring = (
  page: Page,
  testContext: TestContext
) => {
  page.on('websocket', (ws) => {
    console.log(`WebSocket connected: ${ws.url()}`)

    ws.on('framesent', (event) => {
      try {
        const payloadStr =
          typeof event.payload === 'string'
            ? event.payload
            : event.payload.toString()
        const payload = JSON.parse(payloadStr)
        testContext.addSDKEvent(payload, 'send')
      } catch (error) {
        console.warn('Failed to parse sent frame:', error)
      }
    })

    ws.on('framereceived', (event) => {
      try {
        const payloadStr =
          typeof event.payload === 'string'
            ? event.payload
            : event.payload.toString()
        const payload = JSON.parse(payloadStr)
        testContext.addSDKEvent(payload, 'recv')
      } catch (error) {
        console.warn('Failed to parse received frame:', error)
      }
    })

    ws.on('close', () => {
      console.log('WebSocket disconnected')
      testContext.addSDKEvent(
        {
          event: 'websocket_closed',
        },
        'recv'
      )
    })
  })
}

export const createCFClient = async (
  page: Page,
  params?: CreateCFClientParams
): Promise<SignalWireContract> => {
  const sat = await createTestSATToken(params?.reference)
  expect(sat, 'SAT token created').toBeDefined()
  return createCFClientWithToken(page, sat, params)
}

export const createGuestCFClient = async (
  page: Page,
  bodyData: GuestSATTokenRequest,
  params?: CreateCFClientParams
): Promise<SignalWireContract> => {
  const sat = await createGuestSATToken(bodyData)
  return createCFClientWithToken(page, sat, params)
}

const createCFClientWithToken = async (
  page: Page,
  sat: string | null,
  params?: CreateCFClientParams
): Promise<SignalWireContract> => {
  if (!sat) {
    console.error('Invalid SAT. Exiting..')
    process.exit(4)
  }

  const { attachSagaMonitor = false } = params || {}

  const swClient = (await expectPageEvalToPass(page, {
    evaluateArgs: {
      RELAY_HOST: process.env.RELAY_HOST,
      API_TOKEN: sat,
      attachSagaMonitor,
    },
    evaluateFn: async (options) => {
      const _runningWorkers: any[] = []
      // @ts-expect-error - _runningWorkers is not defined in the window object
      window._runningWorkers = _runningWorkers
      const addTask = (task: any) => {
        if (!_runningWorkers.includes(task)) {
          _runningWorkers.push(task)
        }
      }
      const removeTask = (task: any) => {
        const index = _runningWorkers.indexOf(task)
        if (index > -1) {
          _runningWorkers.splice(index, 1)
        }
      }

      const sagaMonitor = {
        effectResolved: (_effectId: number, result: any) => {
          if (result?.toPromise) {
            addTask(result)
            // Remove the task when it completes or is cancelled
            result.toPromise().finally(() => {
              removeTask(result)
            })
          }
        },
      }

      const SignalWire = window._SWJS.SignalWire
      if (!SignalWire) {
        throw new Error('SignalWire is not defined')
      }
      if (!options.RELAY_HOST) {
        throw new Error('Relay host is not defined')
      }
      if (!options.API_TOKEN) {
        throw new Error('API token is not defined')
      }

      const client: SignalWireContract = await SignalWire({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        debug: { logWsTraffic: true },
        logLevel: 'debug',
        ...(options.attachSagaMonitor && { sagaMonitor }),
      })

      window._client = client
      return client
    },
    assertionFn: (client) => {
      expect(client, 'SignalWire client should be defined').toBeDefined()
    },
    message: 'expect SignalWire client to be created',
  })) as SignalWireContract

  return swClient
}

interface DialAddressParams {
  address: string
  dialOptions?: Partial<DialParams>
  reattach?: boolean
  shouldWaitForJoin?: boolean
  shouldStartCall?: boolean
  shouldPassRootElement?: boolean
  timeoutMs?: number
}

export const dialAddress = async <TReturn = any>(
  page: Page,
  params: DialAddressParams = {
    address: '',
    dialOptions: {},
    reattach: false,
    shouldPassRootElement: true,
    shouldStartCall: true,
    shouldWaitForJoin: true,
    timeoutMs: 15000,
  }
): Promise<TReturn> => {
  const defaultParams: DialAddressParams = {
    address: '',
    dialOptions: {},
    reattach: false,
    shouldPassRootElement: true,
    shouldStartCall: true,
    shouldWaitForJoin: true,
    timeoutMs: 15000,
  }

  const mergedParams: DialAddressParams = {
    ...defaultParams,
    ...params,
  }

  let joinEventPromise: Promise<TReturn> | null = null

  // Step 1: Create call object and assign to window._callObj
  await expectPageEvalToPass(page, {
    evaluateArgs: {
      address: mergedParams.address,
      dialOptions: JSON.stringify(mergedParams.dialOptions),
      reattach: mergedParams.reattach,
      shouldPassRootElement: mergedParams.shouldPassRootElement,
    },
    evaluateFn: ({ address, dialOptions, reattach, shouldPassRootElement }) => {
      if (!window._client) {
        throw new Error('Client is not defined')
      }
      const client = window._client

      const dialer = reattach ? client.reattach : client.dial

      const call = dialer({
        to: address,
        ...(shouldPassRootElement && {
          rootElement: document.getElementById('rootElement')!,
        }),
        ...JSON.parse(dialOptions),
      })

      window._callObj = call
      return true
    },
    assertionFn: (result) => {
      expect(result, 'call object should be created and assigned').toBe(true)
    },
    message: 'expect to create call object and assign to window._callObj',
  })

  // Step 2: Set up room.joined event listener (if shouldWaitForJoin)
  if (mergedParams.shouldWaitForJoin) {
    joinEventPromise = expectPageEvalToPass<{}, TReturn>(page, {
      evaluateFn: () => {
        return new Promise<TReturn>((resolve) => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          callObj.on('room.joined', (params) => {
            resolve(params as TReturn)
          })
        })
      },
      assertionFn: (result) => {
        expect(result, 'room.joined event should be received').toBeDefined()
      },
      timeoutMs: mergedParams.timeoutMs,
      message: 'expect to receive room.joined event',
    })
  }

  // Step 3: Start the call (if shouldStartCall)
  if (mergedParams.shouldStartCall) {
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const callObj = window._callObj

        if (!callObj) {
          throw new Error('Call object not found')
        }

        await callObj.start()
        return true
      },
      assertionFn: (result) => {
        expect(result, 'call should start successfully').toBe(true)
      },
      message: 'expect to start the call',
    })
  }

  // Step 4: Return appropriate result
  if (mergedParams.shouldWaitForJoin && joinEventPromise) {
    // Wait for the room.joined event and return the params
    return await joinEventPromise
  } else {
    // Return the call object
    return await expectPageEvalToPass<{}, TReturn>(page, {
      evaluateFn: () => {
        const callObj = window._callObj

        if (!callObj) {
          throw new Error('Call object not found')
        }

        return callObj as TReturn
      },
      assertionFn: (result) => {
        expect(result, 'call object should be returned').toBeDefined()
      },
      message: 'expect to return call object',
    })
  }
}

export const reloadAndReattachAddress = async (
  page: Page,
  params: Omit<DialAddressParams, 'reattach'>
) => {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await createCFClient(page)

  return dialAddress(page, { ...params, reattach: true })
}

export const disconnectClient = (page: Page) => {
  return page.evaluate(async () => {
    const client = window._client

    if (!client) {
      console.log('Client is not available')
    } else {
      await client.disconnect()
      console.log('Client disconnected')
    }
  })
}

// #endregion

// #region Utilities for the MCU

export const expectMCUVisible = async (page: Page) => {
  await page.waitForSelector('div[id^="sw-sdk-"] > video')
}

export const expectMCUNotVisible = async (page: Page) => {
  const mcuVideo = await page.$('div[id^="sw-sdk-"] > video')
  expect(mcuVideo, 'MCU video should be null').toBeNull()
}

export const expectMCUVisibleForAudience = async (page: Page) => {
  await page.waitForSelector('#rootElement video')
}

// #endregion

// #region Utilities for RTP Media stats and SDP

interface RTPInboundMediaStats {
  packetsReceived: number
  packetsLost: number
  packetsDiscarded?: number
}

interface RTPOutboundMediaStats {
  active: boolean
  packetsSent: number
  targetBitrate: number
  totalPacketSendDelay: number
}

interface GetStatsResult {
  inboundRTP: {
    audio: RTPInboundMediaStats
    video: RTPInboundMediaStats
  }
  outboundRTP: {
    audio: RTPOutboundMediaStats
    video: RTPOutboundMediaStats
  }
}

export const getStats = async (page: Page): Promise<GetStatsResult> => {
  return await expectPageEvalToPass(page, {
    evaluateFn: async () => {
      const callObj = window._callObj
      if (!callObj) {
        throw new Error('Call object not found')
      }

      // @ts-expect-error - peer is not defined in the call object
      const rtcPeer = callObj.peer

      // Get the currently active inbound and outbound tracks.
      const inboundAudioTrackId = rtcPeer._getReceiverByKind('audio')?.track.id
      const inboundVideoTrackId = rtcPeer._getReceiverByKind('video')?.track.id
      const outboundAudioTrackId = rtcPeer._getSenderByKind('audio')?.track.id
      const outboundVideoTrackId = rtcPeer._getSenderByKind('video')?.track.id

      // Default return value
      const result: GetStatsResult = {
        inboundRTP: {
          audio: {
            packetsReceived: 0,
            packetsLost: 0,
            packetsDiscarded: 0,
          },
          video: {
            packetsReceived: 0,
            packetsLost: 0,
            packetsDiscarded: 0,
          },
        },
        outboundRTP: {
          audio: {
            active: false,
            packetsSent: 0,
            targetBitrate: 0,
            totalPacketSendDelay: 0,
          },
          video: {
            active: false,
            packetsSent: 0,
            targetBitrate: 0,
            totalPacketSendDelay: 0,
          },
        },
      }

      const inboundRTPFilters = {
        audio: ['packetsReceived', 'packetsLost', 'packetsDiscarded'] as const,
        video: ['packetsReceived', 'packetsLost', 'packetsDiscarded'] as const,
      }

      const outboundRTPFilters = {
        audio: [
          'active',
          'packetsSent',
          'targetBitrate',
          'totalPacketSendDelay',
        ] as const,
        video: [
          'active',
          'packetsSent',
          'targetBitrate',
          'totalPacketSendDelay',
        ] as const,
      }

      const handleInboundRTP = (report: any) => {
        const media = report.mediaType as 'audio' | 'video'
        if (!media) return

        // Check if trackIdentifier matches the currently active inbound track
        const expectedTrackId =
          media === 'audio' ? inboundAudioTrackId : inboundVideoTrackId

        if (
          report.trackIdentifier &&
          report.trackIdentifier !== expectedTrackId
        ) {
          console.log(
            `inbound-rtp trackIdentifier "${report.trackIdentifier}" and trackId "${expectedTrackId}" are different for "${media}"`
          )
          return
        }

        inboundRTPFilters[media].forEach((key) => {
          result.inboundRTP[media][key] = report[key]
        })
      }

      const handleOutboundRTP = (report: any) => {
        const media = report.mediaType as 'audio' | 'video'
        if (!media) return

        // Check if trackIdentifier matches the currently active outbound track
        const expectedTrackId =
          media === 'audio' ? outboundAudioTrackId : outboundVideoTrackId
        if (
          report.trackIdentifier &&
          report.trackIdentifier !== expectedTrackId
        ) {
          console.log(
            `outbound-rtp trackIdentifier "${report.trackIdentifier}" and trackId "${expectedTrackId}" are different for "${media}"`
          )
          return
        }

        outboundRTPFilters[media].forEach((key) => {
          ;(result.outboundRTP[media] as any)[key] = report[key]
        })
      }

      // Iterate over all RTCStats entries
      const pc: RTCPeerConnection = rtcPeer.instance
      const stats = await pc.getStats()
      stats.forEach((report) => {
        switch (report.type) {
          case 'inbound-rtp':
            handleInboundRTP(report)
            break
          case 'outbound-rtp':
            handleOutboundRTP(report)
            break
        }
      })

      return result
    },
    assertionFn: (result) => {
      expect(result, 'expect RTP stats to be defined').toBeDefined()
    },
    message: 'expect to get RTP stats',
  })
}

// TODO: This is not used anywhere, remove it?
export const expectPageReceiveMedia = async (page: Page, delay = 5_000) => {
  const first = await getStats(page)
  await page.waitForTimeout(delay)
  const last = await getStats(page)

  const seconds = delay / 1000
  const minAudioPacketsExpected = 40 * seconds
  const minVideoPacketsExpected = 25 * seconds

  expect(
    last.inboundRTP.video?.packetsReceived,
    'last inbound video packets received should be greater than first inbound video packets received'
  ).toBeGreaterThan(
    (first.inboundRTP.video?.packetsReceived || 0) + minVideoPacketsExpected
  )
  expect(
    last.inboundRTP.audio?.packetsReceived,
    'last inbound audio packets received should be greater than first inbound audio packets received'
  ).toBeGreaterThan(
    (first.inboundRTP.audio?.packetsReceived || 0) + minAudioPacketsExpected
  )
}

export const getAudioStats = async (page: Page) => {
  const audioStats = await page.evaluate(async () => {
    const callObj = window._callObj
    if (!callObj) {
      throw new Error('Call object not found')
    }

    // @ts-expect-error - peer is not defined in the call object
    const audioTrackId = callObj.peer._getReceiverByKind('audio').track.id

    // @ts-expect-error - peer is not defined in the call object
    const stats = await callObj.peer.instance.getStats(null)
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

  return audioStats
}

export const expectTotalAudioEnergyToBeGreaterThan = async (
  page: Page,
  value: number
) => {
  const audioStats = await getAudioStats(page)

  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  if (totalAudioEnergy) {
    expect(
      totalAudioEnergy,
      'totalAudioEnergy should be greater than value'
    ).toBeGreaterThan(value)
  } else {
    console.warn(
      'Warning - totalAudioEnergy was not present in the audioStats.'
    )
  }
}

export const expectPageReceiveAudio = async (page: Page) => {
  await page.waitForTimeout(10000)
  await expectTotalAudioEnergyToBeGreaterThan(page, 0.5)
}

// TODO: This is not used anywhere, remove it?
export const expectSDPDirection = async (
  page: Page,
  direction: string,
  value: boolean
) => {
  const peerSDP = await page.evaluate(async () => {
    const callObj = window._callObj
    if (!callObj) {
      throw new Error('Call object not found')
    }

    // @ts-expect-error - peer is not defined in the call object
    return callObj.peer.localSdp
  })

  expect(
    peerSDP.split('m=')[1].includes(direction),
    'peerSDP should include direction in m= section 1'
  ).toBe(value)
  expect(
    peerSDP.split('m=')[2].includes(direction),
    'peerSDP should include direction in m= section 2'
  ).toBe(value)
}

// TODO: This is not used anywhere, remove it?
export const getRemoteMediaIP = async (page: Page) => {
  const remoteIP: string = await page.evaluate(() => {
    // @ts-expect-error
    const peer = window._callObj.peer
    const lines = peer.instance?.remoteDescription?.sdp?.split('\r\n')
    const ipLine = lines?.find((line: any) => line.includes('c=IN IP4'))
    return ipLine?.split(' ')[2]
  })
  return remoteIP
}

interface WaitForStabilizedStatsParams {
  propertyPath: string
  maxAttempts?: number
  stabilityCount?: number
  intervalMs?: number
}
/**
 * Waits for a given RTP stats property to stabilize.
 * A stat is considered stable if the last `stabilityCount` readings are constant.
 * Returns the stabled value.
 */
export const waitForStabilizedStats = async (
  page: Page,
  params: WaitForStabilizedStatsParams
) => {
  const {
    propertyPath,
    maxAttempts = 50,
    stabilityCount = 10,
    intervalMs = 1000,
  } = params

  const recentValues: number[] = []

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const stats = await getStats(page)
    const currentValue = getValueFromPath(stats, propertyPath) as number

    recentValues.push(currentValue)

    if (recentValues.length >= stabilityCount) {
      const lastNValues = recentValues.slice(-stabilityCount)
      const allEqual = lastNValues.every((val) => val === lastNValues[0])
      if (allEqual) {
        // The stat is stable now
        return lastNValues[0]
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  // If we get here, the value never stabilized.
  throw new Error(
    `The value at "${propertyPath}" did not stabilize after ${maxAttempts} attempts.`
  )
}

/**
 * Retrieves a value from an object at a given path.
 *
 * @example
 * const obj = { a: { b: { c: 42 } } };
 * const result = getValueFromPath(obj, "a.b.c"); // 42
 */
export const getValueFromPath = <T>(obj: T, path: string) => {
  let current: unknown = obj
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

interface ExpectStatWithPollingParams {
  propertyPath: string
  matcher:
    | 'toBe'
    | 'toBeGreaterThan'
    | 'toBeLessThan'
    | 'toBeGreaterThanOrEqual'
    | 'toBeLessThanOrEqual'
  expected: number
  message?: string
  timeout?: number
}

export async function expectStatWithPolling(
  page: Page,
  params: ExpectStatWithPollingParams
) {
  const { propertyPath, matcher, expected, message, timeout = 10000 } = params

  const defaultMessage = `Expected \`${propertyPath}\` ${matcher} ${expected}`
  await expect
    .poll(
      async () => {
        const stats = await getStats(page)
        const value = getValueFromPath(stats, propertyPath) as number
        return value
      },
      { message: message ?? defaultMessage, timeout }
    )
    [matcher](expected)
}

// #endregion

// #region Utilities for v2 WebRTC testing

export type StatusEvents = 'initiated' | 'ringing' | 'answered' | 'completed'

// TODO: This is not used anywhere, remove it?
export const createCallWithCompatibilityApi = async (
  resource: string,
  inlineLaml: string,
  codecs?: string | undefined,
  statusCallbackUrl?: string | undefined,
  statusEvents?: StatusEvents[] | undefined,
  statusCallBackMethod: 'GET' | 'POST' = 'POST'
) => {
  const data = new URLSearchParams()

  if (inlineLaml !== null && inlineLaml !== '') {
    data.append('Laml', inlineLaml)
  }
  data.append('From', `${process.env.VOICE_DIAL_FROM_NUMBER}`)

  const vertoDomain = process.env.VERTO_DOMAIN
  expect(vertoDomain, 'vertoDomain should be defined').toBeDefined()

  let to = `verto:${resource}@${vertoDomain}`
  if (codecs) {
    to += `;codecs=${codecs}`
  }
  data.append('To', to)

  data.append('Record', 'true')
  data.append('RecordingChannels', 'dual')
  data.append('Trim', 'do-not-trim')

  if (statusCallbackUrl && statusEvents) {
    data.append('StatusCallback', statusCallbackUrl)
    for (const event of statusEvents) {
      data.append('StatusCallbackEvent', event)
    }
    data.append('StatusCallbackMethod', statusCallBackMethod)
  }

  console.log(
    'REST API URL: ',
    `https://${process.env.API_HOST}/api/laml/2010-04-01/Accounts/${process.env.RELAY_PROJECT}/Calls`
  )
  console.log('REST API payload: ', data)

  const response = await fetch(
    `https://${process.env.API_HOST}/api/laml/2010-04-01/Accounts/${process.env.RELAY_PROJECT}/Calls`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: data,
    }
  )

  if (Number.isInteger(Number(response.status)) && response.status !== null) {
    if (response.status !== 201) {
      const responseBody = await response.json()
      const formattedBody = JSON.stringify(responseBody, null, 2)

      console.log(
        'ERROR - response from REST API: ',
        response.status,
        ' status text = ',
        response.statusText,
        ' body = ',
        formattedBody
      )
    }
    return response.status
  }
  return undefined
}

// TODO: This is not used anywhere, remove it?
export const getDialConferenceLaml = (conferenceNameBase: string) => {
  const conferenceName = randomizeRoomName(conferenceNameBase)
  const conferenceRegion = process.env.LAML_CONFERENCE_REGION ?? ''
  const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Dial>
        <Conference
          endConferenceOnExit="false"
          startConferenceOnEnter="true"
          waitUrl="https://cdn.signalwire.com/default-music/welcome.mp3"
          waitMethod="GET"
          ${conferenceRegion}>
          ${conferenceName}
        </Conference>
      </Dial>
    </Response>`

  return inlineLaml
}

// TODO: This is not used anywhere, remove it?
export const expectv2HasReceivedAudio = async (
  page: Page,
  minTotalAudioEnergy: number,
  minPacketsReceived: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const currentCall = window.__currentCall
    const audioReceiver = currentCall.peer.instance
      .getReceivers()
      .find((r: any) => r.track.kind === 'audio')

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
  console.log('audioStats: ', audioStats)

  /* This is a workaround what we think is a bug in Playwright/Chromium
   * There are cases where totalAudioEnergy is not present in the report
   * even though we see audio and it's not silence.
   * In that case we rely on the number of packetsReceived.
   * If there is genuine silence, then totalAudioEnergy must be present,
   * albeit being a small number.
   */
  console.log(
    `Evaluating audio energy (min energy: ${minTotalAudioEnergy}, min packets: ${minPacketsReceived})`
  )
  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  const packetsReceived = audioStats['inbound-rtp']['packetsReceived']
  if (totalAudioEnergy) {
    expect(
      totalAudioEnergy,
      'totalAudioEnergy should be greater than minTotalAudioEnergy'
    ).toBeGreaterThan(minTotalAudioEnergy)
  } else {
    console.warn('Warning: totalAudioEnergy was missing from the report!')
    if (packetsReceived) {
      // We still want the right amount of packets
      expect(
        packetsReceived,
        'packetsReceived should be greater than minPacketsReceived'
      ).toBeGreaterThan(minPacketsReceived)
    } else {
      console.warn('Warning: packetsReceived was missing from the report!')
      /* We don't make this test fail, because the absence of packetsReceived
       * is a symptom of an issue with RTCStats, rather than an indication
       * of lack of RTP flow.
       */
    }
  }
}

// TODO: This is not used anywhere, remove it?
export const expectv2HasReceivedSilence = async (
  page: Page,
  maxTotalAudioEnergy: number,
  minPacketsReceived: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const currentCall = window.__currentCall
    const audioReceiver = currentCall.peer.instance
      .getReceivers()
      .find((r: any) => r.track.kind === 'audio')

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
  console.log('audioStats: ', audioStats)

  /* This is a workaround what we think is a bug in Playwright/Chromium
   * There are cases where totalAudioEnergy is not present in the report
   * even though we see audio and it's not silence.
   * In that case we rely on the number of packetsReceived.
   * If there is genuine silence, then totalAudioEnergy must be present,
   * albeit being a small number.
   */
  console.log(
    `Evaluating audio energy (max energy: ${maxTotalAudioEnergy}, min packets: ${minPacketsReceived})`
  )
  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  const packetsReceived = audioStats['inbound-rtp']['packetsReceived']
  if (totalAudioEnergy) {
    expect(
      totalAudioEnergy,
      'totalAudioEnergy should be less than maxTotalAudioEnergy'
    ).toBeLessThan(maxTotalAudioEnergy)
  } else {
    console.warn('Warning: totalAudioEnergy was missing from the report!')
    if (packetsReceived) {
      // We still want the right amount of packets
      expect(
        packetsReceived,
        'packetsReceived should be greater than minPacketsReceived'
      ).toBeGreaterThan(minPacketsReceived)
    } else {
      console.warn('Warning: packetsReceived was missing from the report!')
      /* We don't make this test fail, because the absence of packetsReceived
       * is a symptom of an issue with RTCStats, rather than an indication
       * of lack of RTP flow.
       */
    }
  }
}

// TODO: This is not used anywhere, remove it?
export const expectedMinPackets = (
  packetRate: number,
  callDurationMs: number,
  maxMissingPacketsTolerance: number // 0 to 1.0
) => {
  if (maxMissingPacketsTolerance < 0) {
    maxMissingPacketsTolerance = 0
  }
  if (maxMissingPacketsTolerance > 1) {
    maxMissingPacketsTolerance = 1
  }

  const minPackets =
    (callDurationMs * (1 - maxMissingPacketsTolerance) * packetRate) / 1000

  return minPackets
}

// TODO: This is not used anywhere, remove it?
export const randomizeResourceName = (prefix: string = 'e2e') => {
  return `res-${prefix}${uuid()}`
}

// TODO: This is not used anywhere, remove it?
export const expectInjectRelayHost = async (page: Page, host: string) => {
  await page.evaluate(
    async (params) => {
      // @ts-expect-error
      window.__host = params.host
    },
    {
      host: host,
    }
  )
}

export const expectInjectIceTransportPolicy = async (
  page: Page,
  iceTransportPolicy: string
) => {
  await page.evaluate(
    async (params) => {
      // @ts-expect-error
      window.__iceTransportPolicy = params.iceTransportPolicy
    },
    {
      iceTransportPolicy,
    }
  )
}

export const expectRelayConnected = async (
  page: Page,
  envRelayProject: string,
  jwt: string
) => {
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

export class MockWebhookServer extends EventEmitter {
  private app: Express
  private server: Server
  private zrokProcess: ChildProcessWithoutNullStreams

  constructor() {
    super()
    this.app = express()
    this.app.use(express.urlencoded({ extended: true }))
    const self = this
    this.app.all('/', (req: Request, res: Response) => {
      self.emit('request', req)
      console.log('request body: ', req.body)
      res.status(204).end()
    })
  }

  listen(port: number = 18989, startTunnel: boolean = false) {
    return new Promise<string>((resolve) => {
      this.server = this.app.listen(port, (err?: Error) => {
        if (err) {
          console.error('Error Starting MockWebhookServer: ', err)
          process.exit(5)
        }
        if (startTunnel == false) {
          resolve('Started without tunnel')
          return
        }
      })

      if (startTunnel) {
        const MAX_RETRIES = 3
        const tunnel = (attempt = 0) => {
          try {
            this.zrokProcess = spawn('zrok', [
              'share',
              'public',
              '--backend-mode',
              'proxy',
              '--headless',
              '--insecure',
              `${port}`,
            ])
            this.zrokProcess.on('error', (err) => {
              console.error('zrok process error event: ', err)
            })
            this.zrokProcess.stdout.on('data', (data) => {
              console.log(`zrok processs stdout: ${data}`)
            })
            this.zrokProcess.stderr.on('data', (data) => {
              const dataStr = data.toString('utf-8')
              // zrok is writing only to std error for every logs
              try {
                const logObj = JSON.parse(dataStr)
                if (logObj.level == 'info') {
                  console.log(`zrok process stdout: ${data}`)
                  if (
                    logObj.msg &&
                    logObj.msg.startsWith(
                      'access your zrok share at the following endpoints:'
                    )
                  ) {
                    const tunnelUrl = logObj.msg.split('\n')[1].trim()
                    resolve(tunnelUrl as string)
                  }
                } else {
                  console.error(`zrok process stderr: ${data}`)
                }
              } catch (e) {
                if (dataStr.startsWith('[ERROR]: unable to create share')) {
                  console.error('Error Starting Zrok Share: ', dataStr)
                  if (attempt < MAX_RETRIES) {
                    console.log(`Retrying (attempt: ${attempt + 1} `)
                    tunnel(attempt + 1)
                  } else {
                    process.exit(5)
                  }
                }
              }
            })

            this.zrokProcess.on('close', (code) => {
              console.log(`zrok process exited with code ${code}`)
            })
          } catch (err) {
            console.error('Error Starting Zrok Share: ', err)
            if (attempt < MAX_RETRIES) {
              console.log(`Retrying (attempt: ${attempt + 1} `)
              tunnel(attempt + 1)
            } else {
              process.exit(5)
            }
          }
        }

        tunnel()
      }
    })
  }

  waitFor(status: StatusEvents) {
    return new Promise((resolve) => {
      this.on('request', (req: Request) => {
        if (req.body.CallStatus === status) {
          resolve(req.body)
        }
      })
    })
  }

  close() {
    this.server.close()
    this.zrokProcess.kill('SIGKILL')
  }
}

// #endregion

// #region Utilities for Resources CRUD operations

export interface Resource {
  id: string
  project_id: string
  type: string
  display_name: string
  created_at: string
  cxml_script?: CXMLApplication
  cxml_webhook?: CXMLApplication
}

export interface CXMLApplication {
  id: string
  // and other things
}

export const createVideoRoomResource = async (name?: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/conference_rooms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e_${uuid()}`,
      }),
    }
  )
  const data = (await response.json()) as Resource
  expect(data.id, 'Video Room resource created').toBeDefined()
  console.log('>> Resource VideoRoom created:', data.id, name)
  return data
}

export interface CreateSWMLAppResourceParams {
  name?: string
  contents: Record<any, any>
}
export const createSWMLAppResource = async ({
  name,
  contents,
}: CreateSWMLAppResourceParams) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/swml_scripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e_${uuid()}`,
        contents: JSON.stringify(contents),
      }),
    }
  )
  const data = (await response.json()) as Resource
  console.log('>> Resource SWML App created:', data.id)
  if (!data.id) {
    throw new Error('Failed to create SWML App resource')
  }
  return data
}

export interface CreatecXMLScriptParams {
  name?: string
  contents: Record<any, any>
}
export const createcXMLScriptResource = async ({
  name,
  contents,
}: CreatecXMLScriptParams) => {
  const requestBody = {
    name: name ?? `e2e_${uuid()}`,
    contents: contents.call_handler_script,
  }
  console.log('-----> request body (script):', requestBody)

  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/cxml_scripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    }
  )
  const data = (await response.json()) as Resource
  console.log('----> data:', data)
  console.log('>> Resource cXML Script created:', data.id)
  if (!data.id) {
    throw new Error('Failed to create cXML Script resource')
  }
  return data
}

export interface CreatecXMLExternalURLParams {
  name?: string
  contents: Record<any, any>
}
export const createcXMLExternalURLResource = async ({
  name,
  contents,
}: CreatecXMLExternalURLParams) => {
  const requestBody = {
    name: name ?? `e2e_${uuid()}`,
    primary_request_url: contents.primary_request_url,
  }
  console.log('-----> request body (external URL):', requestBody)

  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/cxml_webhooks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    }
  )
  const data = (await response.json()) as Resource
  console.log('----> data:', data)
  console.log('>> Resource cXML External URL created:', data.id)
  if (!data.id) {
    throw new Error('Failed to create cXML External URL resource')
  }
  return data
}

export interface CreateRelayAppResourceParams {
  name?: string
  topic: string
}
export const createRelayAppResource = async ({
  name,
  topic,
}: CreateRelayAppResourceParams) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/relay_applications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e_${uuid()}`,
        topic,
      }),
    }
  )
  const data = (await response.json()) as Resource
  console.log('>> Resource Relay App created:', data.id)
  if (!data.id) {
    throw new Error('Failed to create Relay App resource')
  }
  return data
}

export const deleteResource = async (id: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
    }
  )
  return response
}

// #endregion

// #region Utilities for Events assertion

// TODO: This is not used anywhere, remove it?
export const expectMemberTalkingEvent = (page: Page) => {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      const callObj = window._callObj
      if (!callObj) {
        throw new Error('Call object not found')
      }
      callObj.on('member.talking', resolve)
    })
  })
}

// TODO: This is not used anywhere, remove it?
export const expectMediaEvent = (page: Page, event: MediaEventNames) => {
  return page.evaluate(
    ({ event }) => {
      return new Promise<void>((resolve) => {
        const callObj = window._callObj
        if (!callObj) {
          throw new Error('Call object not found')
        }
        callObj.on(event, resolve)
      })
    },
    { event }
  )
}

export const expectCFInitialEvents = (
  page: Page,
  extraEvents: Promise<boolean>[] = []
) => {
  const initialEvents = page.evaluate(async () => {
    const callObj = window._callObj
    if (!callObj) {
      throw new Error('Call object not found')
    }

    const callCreated = new Promise<boolean>((resolve) => {
      callObj.on('call.state', (params) => {
        if (params.call_state === 'created') {
          resolve(true)
        }
      })
    })
    const callAnswered = new Promise<boolean>((resolve) => {
      callObj.on('call.state', (params) => {
        if (params.call_state === 'answered') {
          resolve(true)
        }
      })
    })
    const callJoined = new Promise<boolean>((resolve) => {
      callObj.on('call.joined', () => resolve(true))
    })

    return Promise.all([callJoined, callCreated, callAnswered])
  })
  return Promise.all([initialEvents, ...extraEvents])
}

export const expectCFFinalEvents = async (
  page: Page,
  extraEvents: Promise<boolean>[] = [],
  { timeoutMs }: { timeoutMs?: number } = {}
) => {
  const finalEvents = expectPageEvalToPass(page, {
    evaluateFn: () => {
      return new Promise<boolean>((resolve) => {
        const callObj = window._callObj
        if (!callObj) {
          throw new Error('Call object not found')
        }

        callObj.on('destroy', () => {
          resolve(true)
        })
      })
    },
    assertionFn: (result) => {
      expect(result, 'expect call to emit destroy event').toBe(true)
    },
    message: 'expect call to emit destroy event',
    ...(timeoutMs && { timeoutMs }),
  })

  return await Promise.all([finalEvents, ...extraEvents])
}

export const expectLayoutChanged = async (page: Page, layoutName: string) => {
  return await expectPageEvalToPass(page, {
    evaluateArgs: { layoutName },
    evaluateFn: (params) => {
      return new Promise<boolean>((resolve) => {
        const callObj = window._callObj
        if (!callObj) {
          throw new Error('Call object not found')
        }
        callObj.on('layout.changed', ({ layout }) => {
          if (layout.name === params.layoutName) {
            resolve(true)
          }
        })
      })
    },
    assertionFn: (result) => {
      expect(result, 'expect layout changed result').toBe(true)
    },
    message: 'expect layout changed result',
  })
}

export const expectRoomJoined = (
  page: Page,
  options: { invokeJoin: boolean } = { invokeJoin: true }
) => {
  return page.evaluate(({ invokeJoin }) => {
    return new Promise<any>(async (resolve, reject) => {
      const callObj = window._callObj
      if (!callObj) {
        throw new Error('Call object not found')
      }

      callObj.once('room.joined', (room) => {
        console.log('Room joined!')
        resolve(room)
      })

      if (invokeJoin) {
        await callObj.start().catch(reject)
      }
    })
  }, options)
}

// #endregion

// TODO: This is not used anywhere, remove it?
export const expectInteractivityMode = async (
  page: Page,
  mode: 'member' | 'audience'
) => {
  const interactivityMode = await page.evaluate(async () => {
    const callObj = window._callObj
    if (!callObj) {
      throw new Error('Call object not found')
    }
    // @ts-expect-error - interactivityMode is not defined in the CallSession interface
    return callObj.interactivityMode
  })

  expect(
    interactivityMode,
    'interactivityMode should be equal to mode'
  ).toEqual(mode)
}

export const setLayoutOnPage = async (page: Page, layoutName: string) => {
  const layoutChanged = await expectPageEvalToPass(page, {
    evaluateArgs: { layoutName },
    evaluateFn: async (params) => {
      const callObj = window._callObj
      if (!callObj) {
        throw new Error('Call object not found')
      }
      await callObj.setLayout({ name: params.layoutName })
      return true
    },
    assertionFn: (result) => {
      expect(result, 'layout changed result should be true').toBe(true)
    },
    message: 'expect set layout',
  })
  return layoutChanged
}

export const randomizeRoomName = (prefix: string = 'e2e') => {
  return `${prefix}${uuid()}`
}

// TODO: This is not used anywhere, remove it?
export const expectMemberId = async (page: Page, memberId: string) => {
  const roomMemberId = await page.evaluate(async () => {
    const callObj = window._callObj
    if (!callObj) {
      throw new Error('Call object not found')
    }
    return callObj.memberId
  })

  expect(roomMemberId, 'roomMemberId should be equal to memberId').toBe(
    memberId
  )
}

/**
 * @description
 * Uses the expect().toPass() Playwright with a default timeout
 *
 */
export const expectToPass = async (
  assertion: () => Promise<void>,
  assertionMessage: string | { message: string },
  options?: { intervals?: number[]; timeout?: number }
) => {
  const mergedOptions = {
    intervals: [10_000], // 10 seconds to avoid polling
    timeout: 10_000,
    ...options,
  }
  return await expect(assertion, assertionMessage).toPass(mergedOptions)
}
/**
 * @description
 * Waits for a function to return a truthy value or not throw within the page context.
 *
 * This utility wraps Playwright's `page.waitForFunction` and is useful for polling the browser context
 * until a certain condition is met. In this wrapper the interval and timeout are set to the same value by default.
 * This is to avoid polling, and have a default timeout of 10 seconds.
 *
 * @note
 * - The function is evaluated in the browser context, so only serializable values can be passed.
 * - Returns when the pageFunction returns a truthy value. It resolves to a JSHandle of the truthy value.
 * - The JSHandle can be passed to other Playwright functions, like `page.evaluate` or `page.evaluateHandle`.
 */

export const waitForFunction = async <TArgs, TResult>(
  page: Page,
  {
    evaluateArgs,
    evaluateFn,
    polling,
    message,
    timeoutMs,
  }: {
    evaluateArgs?: TArgs
    evaluateFn: PageFunction<TArgs, TResult>
    message?: string
    polling?: number
    timeoutMs?: number
  }
) => {
  try {
    const mergedOptions = {
      polling: polling ?? 10_000, // 10 seconds to avoid polling
      timeout: timeoutMs ?? 10_000,
    } satisfies Parameters<Page['waitForFunction']>[2]
    if (evaluateArgs) {
      return await page.waitForFunction(evaluateFn, evaluateArgs, mergedOptions)
    } else {
      // FIXME: remove the type assertion
      return await page.waitForFunction(
        evaluateFn as PageFunction<void, TResult>,
        undefined,
        mergedOptions
      )
    }
  } catch (error) {
    // TODO: improve error message and logging
    if (message) {
      throw new Error(`waitForFunction: ${message} - ${error}`)
    } else {
      throw new Error(`waitForFunction: ${error}`)
    }
  }
}

/**
 * @description
 * Utility to evaluate a function in the browser context and assert its result using Playwright's expect.
 *
 * This function wraps a call to `page.evaluate` and uses the expectToPass utility to assert that a promise resolves
 *
 * @note
 * - The function is evaluated in the browser context, so only serializable values can be passed.
 * - Only serializable values can be returned
 * - The assertion function should use the `expect` function to assert the result
 * -  Throws timeout error if the promise does not resolve within the timeout
 */
export const expectPageEvalToPass = async <TArgs, TResult>(
  page: Page,
  {
    assertionFn,
    evaluateArgs,
    evaluateFn,
    message,
    intervals = [10_000],
    timeoutMs = 10_000,
  }: {
    assertionFn: (result: TResult) => void
    evaluateArgs?: TArgs
    evaluateFn: PageFunction<TArgs, TResult>
    message: string
    intervals?: number[]
    timeoutMs?: number
  }
) => {
  // NOTE: force the result to be the resolved value of the promise to avoid `undefined` check
  let result = undefined as TResult
  await expectToPass(
    async () => {
      // evaluate the function with the provided arguments
      if (evaluateArgs) {
        result = await page.evaluate(
          evaluateFn as PageFunction<TArgs, TResult>,
          evaluateArgs
        )
      } else {
        // evaluate the function without arguments
        result = await page.evaluate(evaluateFn as PageFunction<void, TResult>)
      }

      assertionFn(result)
    },
    { message: message },
    { timeout: timeoutMs, intervals: intervals }
  )
  return result
}

// #region TestContext Utilities

export interface ContextData {
  stats: EventStats
  events: SDKEvent[]
  testDuration: number
}

// Helper function to register a test context (to be called from tests)
export const attachTestContext = async (
  testInfo: TestInfo,
  testContext: TestContext
) => {
  try {
    const contextData = {
      stats: testContext.getStats(),
      events: testContext.getAllEvents(),
      testDuration: testContext.getTestDuration(),
    }

    // Log to console immediately for all environments
    const dumpContent = createContextDumpText(contextData)
    console.log('\n[INFO] SDK Test Context captured:')
    console.log(dumpContent)

    // Attach as JSON data for Playwright UI
    await testInfo.attach('SDK Test Context (JSON)', {
      body: JSON.stringify(contextData, null, 2),
      contentType: 'application/json',
    })

    // Attach as human-readable text dump for Playwright UI
    await testInfo.attach('SDK Test Context', {
      body: dumpContent,
      contentType: 'text/plain',
    })
  } catch (error) {
    console.log(`Failed to attach test context: ${error}`)
  }
}

// Create human-readable context dump text
export const createContextDumpText = (contextData: ContextData) => {
  const stats = contextData.stats
  let dump = ''

  dump += '* '.repeat(40) + '\n'
  dump += 'SDK TEST CONTEXT DUMP\n'
  dump += '* '.repeat(40) + '\n\n'

  // Summary stats
  dump += 'EVENT SUMMARY:\n'
  dump += `   Total Events: ${stats.totalEvents}\n`
  dump += `   Sent: ${stats.sentEvents} | Received: ${stats.receivedEvents}\n`
  dump += `   Errors: ${stats.errorEvents} | Call: ${stats.callEvents} | Room: ${stats.roomEvents}\n`
  dump += `   Connection: ${stats.connectionEvents}\n`
  dump += `   Test Duration: ${contextData.testDuration}ms\n\n`

  // Show error events if any
  const errorEvents = contextData.events.filter(
    (event) => event.context.isError
  )
  if (errorEvents.length > 0) {
    dump += 'ERROR EVENTS:\n'
    errorEvents.forEach((event, index) => {
      const time = new Date(event.timestamp).toISOString().substring(11, 23)
      dump += `   ${index + 1}. ${time} [${event.direction.toUpperCase()}] ${
        event.eventType
      }\n`
      dump += `      Error: ${
        event.payload.error?.message || 'Unknown error'
      }\n`
      if (event.payload.error?.code) {
        dump += `      Code: ${event.payload.error.code}\n`
      }
    })
    dump += '\n'
  }

  // Show recent events timeline
  dump += 'RECENT EVENTS (Last 15):\n'
  const recentEvents = contextData.events.slice(-15)
  recentEvents.forEach((event, index) => {
    const time = new Date(event.timestamp).toISOString().substring(11, 23)
    const direction = event.direction === 'send' ? 'SEND' : 'RECV'

    dump += `   ${(index + 1).toString().padStart(2)}. ${time} [${direction}] ${
      event.eventType
    }\n`

    if (event.context.isCallEvent && event.context.callId) {
      dump += `      Call ID: ${event.context.callId}\n`
    }
    if (event.context.isRoomEvent && event.context.roomId) {
      dump += `      Room ID: ${event.context.roomId}\n`
    }
    if (event.context.isError) {
      dump += `      Error: ${
        event.payload.error?.message || 'Error occurred'
      }\n`
    }
  })
  dump += '\n'

  // Show detailed payload for last few events
  if (stats.totalEvents > 0) {
    dump += 'LAST EVENT DETAILS:\n'
    const lastEvents = contextData.events.slice(-3)
    lastEvents.forEach((event, index) => {
      dump += `   ${index + 1}. [${event.direction.toUpperCase()}] ${
        event.eventType
      }:\n`
      dump += `      ${JSON.stringify(event.payload, null, 6)}\n`
    })
  }

  dump += '\n' + '* '.repeat(40) + '\n'

  return dump
}

// #endregion
