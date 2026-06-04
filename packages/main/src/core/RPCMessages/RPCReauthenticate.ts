import { buildRPCRequest } from './helpers';

import type { JSONRPCRequest } from './types/base';

export interface RPCReauthenticateParams {
  project: string;

  jwt_token: string;

  /** DPoP proof JWT for Client Bound SAT verification. */
  dpop_token?: string;
}

export const RPCReauthenticate = (params: RPCReauthenticateParams): JSONRPCRequest => {
  const { dpop_token, ...authFields } = params;
  return buildRPCRequest({
    method: 'signalwire.reauthenticate',
    params: {
      authentication: authFields,
      ...(dpop_token ? { dpop_token } : {})
    }
  });
};
