/** Parameters for creating an HTTP DPoP proof (for Prime API endpoints). */
export interface DPoPHttpProofParams {
  /** HTTP method (e.g., "POST"). */
  readonly method: string;
  /** Request URI — should be the full URL per RFC 9449 (e.g., "https://fabric.signalwire.com/api/..."). */
  readonly uri: string;
  /** Access token to bind via `ath` claim (SHA-256 hash). Used for resource endpoints, not token endpoints. */
  readonly accessToken?: string;
}

/** Parameters for creating an RPC DPoP proof (for switchblade WebSocket methods). */
export interface DPoPRpcProofParams {
  /** RPC method name (e.g., "signalwire.connect" or "signalwire.reauthenticate"). */
  readonly method: string;
}

/** SAT claims returned by /api/fabric/subscriber/info. */
export interface SATClaims {
  /** Token scopes (e.g., ["sat:refresh"]). */
  scope?: string[];
  /** Confirmation claim binding the token to a key. */
  cnf?: { jkt: string };
  /** Token expiry timestamp in seconds since epoch. */
  expires_at?: number;
}

/** Response from /api/fabric/subscriber/devices/token or /devices/refresh. */
export interface DeviceTokenResponse {
  /** The Client Bound SAT (JWE). */
  token: string;
  /** Token expiry timestamp in seconds since epoch, if server provides it. */
  expires_at?: number;
  /** Token lifetime in seconds from now, alternative form. */
  expires_in?: number;
}
