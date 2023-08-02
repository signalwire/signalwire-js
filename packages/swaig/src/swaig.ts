import { Server, ServerOptions } from './Server'

export interface SWAIGOptions extends ServerOptions {}
export interface SWAIG {
  addFunction: Server['defineRoute']
  run: Server['run']
  close: Server['close']
}

export async function SWAIG(options?: SWAIGOptions): Promise<SWAIG> {
  const server = new Server(options)

  const service = {
    addFunction: server.defineRoute.bind(server),
    run: server.run.bind(server),
    close: server.close.bind(server),
  }
  return service
}
