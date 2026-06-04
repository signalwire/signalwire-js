import { map, type OperatorFunction } from 'rxjs';

import { JSONRPCError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { JSONRPCResponse } from '../core/RPCMessages/types/base';

const logger = getLogger();

/**
 * RxJS operator that throws a {@link JSONRPCError} when the RPC response contains an error.
 * Passes successful responses through unchanged.
 */
export function throwOnRPCError<T extends JSONRPCResponse>(): OperatorFunction<T, T> {
  return map((response: T) => {
    if (response.error) {
      logger.error('[throwOnRPCError] RPC error response:', {
        code: response.error.code,
        message: response.error.message,
        data: response.error.data
      });

      throw new JSONRPCError(response.error.code, response.error.message, response.error.data);
    }
    logger.debug('[throwOnRPCError] RPC successful response:', response);
    return response;
  });
}
