import { buildRPCRequest } from './helpers';

import type { JSONRPCRequest, JSONRPCMethod } from './types/base';

interface RPCExecuteParams {
  id?: string;
  method: JSONRPCMethod;
  params: Record<string, unknown>;
}

export const RPCExecute = ({ method, params }: RPCExecuteParams): JSONRPCRequest => {
  return buildRPCRequest({
    method,
    params
  });
};
