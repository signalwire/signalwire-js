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

interface Resource {
  id: string
  project_id: string
  type: string
  display_name: string
  created_at: string
}

const apiFetch = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json()
    console.log(`>> Error with fetch to ${url}:`, error)
    throw error
  }
  return response.json()
}

interface CreateRelayAppResourceParams {
  name: string
  reference: string
}
export const createRelayAppResource = async (
  params: CreateRelayAppResourceParams
) => {
  const url = `https://${process.env.API_HOST}/api/fabric/resources/relay_applications`
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
    body: JSON.stringify(params),
  }
  const data = (await apiFetch(url, options)) as Resource
  console.log('>> Resource Relay App created:', data.id)
  return data
}

interface CreateDomainAppParams {
  name: string
  identifier: string
  call_handler?: 'relay_context'
  call_relay_context: string
}
const createDomainApp = async (params: CreateDomainAppParams) => {
  const url = `https://${process.env.API_HOST}/api/relay/rest/domain_applications`
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
    body: JSON.stringify(params),
  }
  const data = (await apiFetch(url, options)) as DomainApp
  console.log('>> Domain App created:', data.id)
  return data
}

const getDomainApp = async (id: string) => {
  const url = `https://${process.env.API_HOST}/api/relay/rest/domain_applications/${id}`
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
  }
  const data = (await apiFetch(url, options)) as DomainApp
  console.log('>> Domain App fetched:', data.id)
  return data
}

const deleteDomainApp = async (id: string) => {
  const url = `https://${process.env.API_HOST}/api/relay/rest/domain_applications/${id}`
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
  }
  await apiFetch(url, options)
  console.log('>> Domain App deleted:', id)
}

interface AssignResourceToDomainAppParams {
  resourceId: string
  domainAppId: string
}
const assignResourceToDomainApp = async (
  params: AssignResourceToDomainAppParams
) => {
  const { resourceId, domainAppId } = params
  const url = `https://${process.env.API_HOST}/api/fabric/resources/${resourceId}/domain_applications`
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
    body: JSON.stringify({ domain_application_id: domainAppId }),
  }
  await apiFetch(url, options)
  console.log('>> Resource assigned to Domain App')
}

const deleteResource = async (id: string) => {
  const url = `https://${process.env.API_HOST}/api/fabric/resources/${id}`
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthorization(),
    },
  }
  await apiFetch(url, options)
  console.log('>> Resource deleted:', id)
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
      let domainApp: DomainApp | null = null
      let relayApp: Resource | null = null
      const id = uuid
      const domainAppName = `e2e-rt-domain-app-${id}`
      const relayAppName = `e2e-rt-relay-app-${id}`
      const context = `e2e-rt-ctx-${id}`
      const params: TestHandlerParams = {}

      try {
        if (useDomainApp) {
          // Create a domain application
          domainApp = await createDomainApp({
            name: domainAppName,
            identifier: id,
            call_relay_context: context,
          })

          // Create a relay application resource
          relayApp = await createRelayAppResource({
            name: relayAppName,
            reference: context,
          })

          // Assign a Relay App resource as a call handler on a Domain App
          await assignResourceToDomainApp({
            resourceId: relayApp.id,
            domainAppId: domainApp.id,
          })

          // Fetch the updated Domain App and set it to params
          params.domainApp = await getDomainApp(domainApp.id)
        }
        exitCode = await testHandler(params)
      } catch (error) {
        clearTimeout(timer)
        console.error(`Test Runner ${name} Failed!`, error)
        exitCode = 1
      } finally {
        if (domainApp) await deleteDomainApp(domainApp.id)
        if (relayApp) await deleteResource(relayApp.id)
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
