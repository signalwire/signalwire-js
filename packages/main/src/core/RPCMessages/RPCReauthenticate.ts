import { buildRPCRequest } from './helpers';

import type { JSONRPCRequest } from './types/base';

export interface RPCReauthenticateParams {
  project: string;

  jwt_token: string;

  /** DPoP proof JWT for Client Bound SAT verification. */
  dpop_token?: string;
}

/** Wire shape of a `signalwire.reauthenticate` request — auth is nested. */
export interface RPCReauthenticateRequestParams {
  authentication: {
    project: string;
    jwt_token: string;
  };
  /** DPoP proof JWT for Client Bound SAT verification. */
  dpop_token?: string;
}

export interface RPCReauthenticateRequest extends JSONRPCRequest<RPCReauthenticateRequestParams> {
  method: 'signalwire.reauthenticate';
  params: RPCReauthenticateRequestParams;
}

export const RPCReauthenticate = (params: RPCReauthenticateParams): RPCReauthenticateRequest => {
  const { dpop_token, ...authFields } = params;
  return buildRPCRequest({
    method: 'signalwire.reauthenticate',
    params: {
      authentication: authFields,
      ...(dpop_token ? { dpop_token } : {})
    }
  });
};
