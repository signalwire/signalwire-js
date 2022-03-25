import { request } from 'node:https'

const PATH = '/api/relay/rest/tasks'
const HOST = 'relay.signalwire.com'

export interface TaskSendParams {
  host?: string
  project: string
  token: string
  context: string
  message: Record<string, unknown>
}

export const send = ({
  host = HOST,
  project,
  token,
  context,
  message,
}: TaskSendParams) => {
  if (!project || !token) {
    throw new Error('Invalid options: project and token are required!')
  }

  const Authorization = `Basic ${Buffer.from(`${project}:${token}`).toString(
    'base64'
  )}`

  return new Promise<void>((resolve, reject) => {
    const data = JSON.stringify({ context, message })
    const options = {
      host,
      port: 443,
      method: 'POST',
      path: PATH,
      headers: {
        Authorization,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }
    const req = request(options, ({ statusCode }) => {
      statusCode === 204 ? resolve() : reject()
    })

    req.on('error', reject)

    req.write(data)
    req.end()
  })
}
