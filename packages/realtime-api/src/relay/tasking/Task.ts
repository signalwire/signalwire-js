import { request } from 'https'

const TASK_PATH = '/api/relay/rest/tasks'

export class Task {
  /** @internal */
  host: string = 'relay.signalwire.com'

  constructor(public project: string, public token: string) {
    if (!project || !token) {
      throw new Error('Invalid options: project and token required!')
    }
  }

  private basicAuthToken() {
    return `Basic ${Buffer.from(`${this.project}:${this.token}`).toString(
      'base64'
    )}`
  }

  public deliver(context: string, message: any) {
    return new Promise<void>((resolve, reject) => {
      const data = JSON.stringify({ context, message })
      const options = {
        host: this.host,
        port: 443,
        method: 'POST',
        path: TASK_PATH,
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
