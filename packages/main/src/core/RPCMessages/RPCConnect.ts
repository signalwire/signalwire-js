import { buildRPCRequest } from './helpers';

import type { JSONRPCRequest } from './types/base';

interface WithToken {
  token: string;
  jwt_token?: never;
}
interface WithJWT {
  token?: never;
  jwt_token: string;
}
export type RPCConnectAuthentication = { project?: string } & (WithToken | WithJWT);

/**
 * Parameters for `signalwire.connect`.
 *
 * **Fresh connect**: `authentication: { jwt_token }` + `dpop_token` (when client-bound).
 * **Reconnect**: `authentication: { jwt_token: "<stored SAT, even if expired>" }` +
 *   `authorization_state` + `protocol` + `dpop_token`.
 *   The jwt_token is required for session classification even when expired;
 *   authorization_state short-circuits actual token validation.
 */
export interface RPCConnectParams {
  authentication: RPCConnectAuthentication;
  version?: typeof DEFAULT_CONNECT_VERSION;
  agent?: string;
  /** DPoP proof JWT for Client Bound SAT verification. */
  dpop_token?: string;
  /** Encrypted state from a prior session — reconnection optimization. */
  authorization_state?: string;
  /** Required when authorization_state is provided. */
  protocol?: string;
  contexts?: string[];
  topics?: string[];
  eventing?: string[];
  event_acks?: boolean;
}

export interface Authorization {
  jti: string;
  project_id: string;
  data_zone?: string;
  scope?: string[];
  fabric_subscriber: {
    version: number;
    expires_at: number;
    subscriber_id: string;
    application_id: string | null;
    project_id: string;
    space_id: string;
  };
  cnf?: { jkt: string };
}

export interface RPCConnectResult {
  identity: string;
  authorization: Authorization;
  protocol: string;

  ice_servers?: RTCIceServer[];
}

export const DEFAULT_CONNECT_VERSION = {
  major: 4,
  minor: 0,
  revision: 0
};

export const RPCConnect = (params: RPCConnectParams): JSONRPCRequest => {
  return buildRPCRequest({
    method: 'signalwire.connect',
    params: {
      version: DEFAULT_CONNECT_VERSION,

      event_acks: true,
      ...params
    }
  });
};
