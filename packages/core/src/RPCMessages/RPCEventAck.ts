import { makeRPCResponse } from './helpers';


export const RPCEventAckResponse = (id: string) => makeRPCResponse({ id, result: {} })
