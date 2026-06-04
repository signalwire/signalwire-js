import { v4 as uuid } from 'uuid';

import type { JSONRPCRequest, JSONRPCSuccessResponse } from './types/base';

interface MakeRPCRequestParams<
  T extends string = 'execute',
  P extends object = Record<string, unknown>
> {
  id?: string;
  method: T;
  params: P;
}
export const buildRPCRequest = <
  T extends string = 'execute',
  P extends object = Record<string, unknown>
>(
  params: MakeRPCRequestParams<T, P>
): JSONRPCRequest<P> & { method: T; params: P } => {
  return {
    jsonrpc: '2.0' as const,
    id: params.id ?? uuid(),
    ...params
  };
};

interface MakeRPCResponseParams<TResult = unknown> {
  id: string;
  result: TResult;
}
export const makeRPCResponse = <TResult = unknown>(
  params: MakeRPCResponseParams<TResult>
): JSONRPCSuccessResponse<TResult> => {
  return {
    jsonrpc: '2.0' as const,
    ...params
  };
};
