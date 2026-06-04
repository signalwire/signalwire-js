import { makeRPCResponse } from './helpers';

import type { JSONRPCSuccessResponse } from './types/base';

export const RPCDisconnectResponse = (id: string): JSONRPCSuccessResponse => {
  return makeRPCResponse({
    id,
    result: {}
  });
};
