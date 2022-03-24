import { request } from 'node:https'

const PATH = '/api/relay/rest/tasks'

export class Job {
  /** @internal */
  host: string = 'relay.signalwire.com'

  constructor(private project: string, private token: string) {
    if (!project || !token) {
      throw new Error('Invalid options: project and token are required!')
    }
  }

  private basicAuthToken() {
    return `Basic ${Buffer.from(`${this.project}:${this.token}`).toString(
      'base64'
    )}`
  }

  public deliver(context: string, message: Record<string, unknown>) {
    return new Promise<void>((resolve, reject) => {
      const data = JSON.stringify({ context, message })
      const options = {
        host: this.host,
        port: 443,
        method: 'POST',
        path: PATH,
        headers: {
          Authorization: this.basicAuthToken(),
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
}
