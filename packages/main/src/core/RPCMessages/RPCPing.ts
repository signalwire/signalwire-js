import { buildRPCRequest, makeRPCResponse } from './helpers';

import type { JSONRPCSuccessResponse } from './types/base';
import type { SignalwirePingRequest } from './types/events';
import type { SignalwirePingResult } from './types/methods';

export const RPCPing = (): SignalwirePingRequest => {
  return buildRPCRequest({
    method: 'signalwire.ping',
    params: {
      timestamp: Date.now() / 1000
    }
  });
};

export const RPCPingResponse = (
  id: string,
  timestamp?: number
): JSONRPCSuccessResponse<SignalwirePingResult> => {
  return makeRPCResponse<SignalwirePingResult>({
    id,
    result: {
      timestamp: timestamp ?? Date.now() / 1000
    }
  });
};
