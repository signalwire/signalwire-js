import tap from 'tap'
import { request } from 'node:https'
import { randomUUID, randomBytes } from 'node:crypto'

/**
 * 10 seconds to execute the script by default
 */
const MAX_EXECUTION_TIME = 10_000

interface DomainApp {
  type: 'domain_application'
  id: string
  name: string
  domain: string
  identifier: string
  ip_auth_enabled: boolean
  ip_auth: string[]
  call_handler: 'relay_context'
  call_request_url: string | null
  call_request_method: string
  call_fallback_url: string | null
  call_fallback_method: string
  call_status_callback_url: string | null
  call_status_callback_method: string
  call_relay_context: string
  call_laml_application_id: string | null
  call_video_room_id: string | null
  call_relay_script_url: string | null
  encryption: 'optional'
  codecs: ('PCMU' | 'PCMA')[]
  ciphers: string[]
}
interface TestHandlerParams {
  domainApp?: DomainApp
}

export type TestHandler =
  | (() => Promise<number>)
  | ((params: TestHandlerParams) => Promise<number>)

interface CreateTestRunnerParams {
  uuid?: string
  name: string
  testHandler: TestHandler
  executionTime?: number
  useDomainApp?: boolean
}

export const createTestRunner = ({
  uuid = randomUUID(),
  name,
  testHandler,
  executionTime = MAX_EXECUTION_TIME,
  useDomainApp = false,
}: CreateTestRunnerParams) => {
  let timer: ReturnType<typeof setTimeout>

  const start = () => {
    timer = setTimeout(() => {
      console.error(`Test Runner ${name} ran out of time (${executionTime})`)
      process.exit(2)
    }, executionTime)
    tap.setTimeout(executionTime)
  }

  const done = (exitCode: number) => {
    clearTimeout(timer)
    if (exitCode === 0) {
      console.log(`Test Runner ${name} Passed!`)
    } else {
      console.log(`Test Runner ${name} finished with exitCode: ${exitCode}`)
    }
    process.exit(exitCode)
  }

  return {
    run: async () => {
      start()

      let exitCode = 0
      const id = uuid
      const domainAppName = `d-app-${id}`
      const params: TestHandlerParams = {}

      try {
        if (useDomainApp) {
          params.domainApp = await createDomainApp({
            name: domainAppName,
            identifier: id,
            call_handler: 'relay_context',
            call_relay_context: `d-app-ctx-${id}`,
          })
        }
        console.log('Created domain app:', domainAppName)
        exitCode = await testHandler(params)
      } catch (error) {
        clearTimeout(timer)
        console.error(`Test Runner ${name} Failed!`, error)
        exitCode = 1
      } finally {
        if (params.domainApp) {
          await deleteDomainApp({ id: params.domainApp.id })
          console.log('Deleted domain app:', domainAppName)
        }
        done(exitCode)
      }
    },
  }
}

export const getAuthorization = () => {
  const auth = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  return 'Basic ' + Buffer.from(auth).toString('base64')
}

type CreateCRTParams = {
  memberId: string
  channels: Record<string, Partial<Record<'read' | 'write', boolean>>>
}
export const createCRT = ({
  memberId,
  channels,
}: CreateCRTParams): Promise<string> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      ttl: 120,
      member_id: memberId,
      state: {
        displayName: 'E2E Tester',
      },
      channels: channels,
    })
    const options = {
      host: process.env.API_HOST,
      port: 443,
      method: 'POST',
      path: '/api/chat/tokens',
      headers: {
        Authorization: getAuthorization(),
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }
    // console.log('CRT options', options)
    const req = request(options, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('end', () => {
        resolve(JSON.parse(body))
      })
    })

    req.on('error', reject)

    req.write(data)
    req.end()
  })
}

export const sessionStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem(key: string) {
      return store[key] || null
    },
    setItem(key: string, value: string) {
      store[key] = value.toString()
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
}

export const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

export const makeSipDomainAppAddress = ({ name, domain }) => {
  return `sip:${name}-${randomBytes(16).toString('hex')}@${domain}.${
    process.env.DAPP_DOMAIN
  }`
}

type CreateDomainAppParams = {
  name: string
  identifier: string
  call_handler: 'relay_context'
  call_relay_context: string
}
const createDomainApp = async (
  params: CreateDomainAppParams
): Promise<DomainApp> => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/relay/rest/domain_applications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthorization(),
      },
      body: JSON.stringify(params),
    }
  )
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      `Failed to create domain app: ${
        errorData.message || JSON.stringify(errorData)
      }`
    )
  }
  const data = await response.json()
  return data
}

type DeleteDomainAppParams = {
  id: string
}
const deleteDomainApp = async ({
  id,
}: DeleteDomainAppParams): Promise<Response> => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/relay/rest/domain_applications/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthorization(),
      },
    }
  )
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      `Failed to delete domain app: ${
        errorData.message || JSON.stringify(errorData)
      }`
    )
  }
  return response
}

export const CALL_PROPS = [
  'id',
  'callId',
  'nodeId',
  'state',
  'callState',
  // 'tag', // Inbound calls does not have tags
  'device',
  'type',
  'from',
  'to',
  'headers',
  'active',
  'connected',
  'direction',
  // 'context', // Outbound calls do not have context
  // 'connectState', // Undefined unless peer call
  // 'peer', // Undefined unless peer call
  'hangup',
  'pass',
  'answer',
  'play',
  'playAudio',
  'playSilence',
  'playRingtone',
  'playTTS',
  'record',
  'recordAudio',
  'prompt',
  'promptAudio',
  'promptRingtone',
  'promptTTS',
  'sendDigits',
  'tap',
  'tapAudio',
  'connect',
  'connectPhone',
  'connectSip',
  'disconnect',
  'waitForDisconnected',
  'disconnected',
  'detect',
  'amd',
  'detectFax',
  'detectDigit',
  'collect',
  'waitFor',
]

export const CALL_PLAYBACK_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'state',
  'pause',
  'resume',
  'stop',
  'setVolume',
  'ended',
]

export const CALL_RECORD_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'state',
  // 'url', // Sometimes server does not return it
  'record',
  'stop',
  'ended',
]

export const CALL_PROMPT_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'stop',
  'setVolume',
  'ended',
]

export const CALL_COLLECT_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'stop',
  'startInputTimers',
  'ended',
]

export const CALL_TAP_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'stop',
  'ended',
]

export const CALL_DETECT_PROPS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'stop',
  'ended',
]
