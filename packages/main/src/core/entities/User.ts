import { Fetchable } from '../../behaviors/Fetchable';

import type { HTTPRequestController } from '../../controllers/HTTPRequestController';
import type { GetAddressResponse } from '../types/address.types';
import type { SATClaims } from '../types/crypto.types';
import type { GetUserInfoResponse } from '../types/user.types';

/** User online presence state. */
export type UserPresence = 'online' | 'offline' | 'busy';

/**
 * Authenticated user profile.
 *
 * Fetched automatically when a {@link SignalWire} connects.
 * Contains identity, contact, and organization details.
 */
export class User extends Fetchable<GetUserInfoResponse> {
  /** Unique user identifier. */
  public id!: string;
  /** User email address. */
  public email!: string;
  /** First name. */
  public firstName?: string;
  /** Last name. */
  public lastName?: string;
  /** Display name shown to other participants. */
  public displayName?: string;
  /** Job title. */
  public jobTitle?: string;
  /** Time zone offset. */
  public timeZone?: number;
  /** Country code. */
  public country?: string;
  /** Region/state. */
  public region?: string;
  /** Company name. */
  public companyName?: string;
  /** Push notification key for mobile/web push. */
  public pushNotificationKey!: string;
  /** Application-level settings (display name, permission scopes). */
  public appSettings?: {
    displayName: string;
    scopes: string[];
  };
  /** Fabric addresses associated with this user. */
  public addresses!: GetAddressResponse[];
  /** Filtered SAT claims when the token has special capabilities (e.g., refresh scope). */
  public satClaims?: SATClaims;

  constructor(http: HTTPRequestController) {
    super('/api/fabric/subscriber/info', http);
  }

  protected populateInstance(data: GetUserInfoResponse): void {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.displayName = data.display_name;
    this.jobTitle = data.job_title;
    this.timeZone = data.time_zone;
    this.country = data.country;
    this.region = data.region;
    this.companyName = data.company_name;
    this.pushNotificationKey = data.push_notification_key;
    this.appSettings = data.app_settings
      ? {
          displayName: data.app_settings.display_name,
          scopes: data.app_settings.scopes
        }
      : undefined;
    this.addresses = data.fabric_addresses;
    this.satClaims = data.sat_claims;
  }
}
