import { makeRPCResponse } from './helpers';

import type { JSONRPCSuccessResponse } from './types/base';

export const RPCEventAckResponse = (id: string): JSONRPCSuccessResponse =>
  makeRPCResponse({ id, result: {} });
