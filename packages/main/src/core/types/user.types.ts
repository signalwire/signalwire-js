import type { GetAddressResponse } from './address.types';
import type { SATClaims } from './crypto.types';

/** Raw user profile response from the SignalWire Fabric API. */
export interface GetUserInfoResponse {
  /** Unique user identifier. */
  id: string;
  /** User's email address. */
  email: string;
  /** User's first name. */
  first_name?: string;
  /** User's last name. */
  last_name?: string;
  /** User's display name. */
  display_name?: string;
  /** User's job title. */
  job_title?: string;
  /** User's time zone offset. */
  time_zone?: number;
  /** User's country. */
  country?: string;
  /** User's region or state. */
  region?: string;
  /** User's company name. */
  company_name?: string;
  /** Key for push notification delivery. */
  push_notification_key: string;
  /** Application-level settings for this user. */
  app_settings?: {
    /** Display name configured at the application level. */
    display_name: string;
    /** Permission scopes granted to this user. */
    scopes: string[];
  };
  /** Fabric addresses associated with this user. */
  fabric_addresses: GetAddressResponse[];
  /** Filtered SAT claims (scope, cnf, expires_at) returned when the token has special capabilities. */
  sat_claims?: SATClaims;
}
