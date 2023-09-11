import { Server } from './Server'
import type { ServerOptions } from './types'

export interface SWAIGOptions extends ServerOptions {}

export interface SWAIG {
  server: Server['instance']
  addFunction: Server['defineRoute']
  run: Server['run']
  close: Server['close']
}

export async function SWAIG(options: SWAIGOptions): Promise<SWAIG> {
  const server = new Server(options)

  await server.init()

  const service = {
    server: server.instance,
    addFunction: server.defineRoute.bind(server),
    run: server.run.bind(server),
    close: server.close.bind(server),
  }
  return service
}
