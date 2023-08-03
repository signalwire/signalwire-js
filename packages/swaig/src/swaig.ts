import { Server, ServerOptions } from './Server'

export interface SWAIGOptions extends ServerOptions {}
export interface SWAIG {
  server: Server['instance']
  addFunction: Server['defineRoute']
  run: Server['run']
  close: Server['close']
}

export async function SWAIG(options: SWAIGOptions): Promise<SWAIG> {
  const server = new Server(options)

  const service = {
    server: server.instance,
    addFunction: server.defineRoute.bind(server),
    run: server.run.bind(server),
    close: server.close.bind(server),
  }
  return service
}
