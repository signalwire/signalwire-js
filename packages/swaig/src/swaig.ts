import { Server, ServerOptions } from './Server'

export interface SWAIGOptions extends ServerOptions {}

export async function SWAIG(options?: SWAIGOptions) {
  const server = new Server(options)

  const service = {
    addFunction: server.defineRoute.bind(server),
    run: server.run.bind(server),
    close: server.close.bind(server),
  }
  return service
}
