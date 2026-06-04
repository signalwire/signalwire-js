import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User } from './User';
import type { GetUserInfoResponse } from '../types/user.types';
import type { GetAddressResponse } from '../interfaces';

describe('User', () => {
  describe('populateInstance', () => {
    let user: User;

    beforeEach(() => {
      user = new User();
    });

    describe('Happy path - all fields populated', () => {
      it('should populate all required fields with camelCase properties', () => {
        const mockAddress: GetAddressResponse = {
          id: 'addr-123',
          display_name: 'Test Address',
          name: 'test-address',
          resource_id: 'res-123',
          type: 'subscriber',
          channels: {
            audio: 'audio-channel',
            messaging: 'msg-channel',
            video: 'video-channel'
          },
          locked: false,
          created_at: '2024-01-01T00:00:00Z'
        };

        const data: GetUserInfoResponse = {
          id: 'sub-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          display_name: 'John Doe',
          job_title: 'Software Engineer',
          time_zone: -5,
          country: 'US',
          region: 'NY',
          company_name: 'Acme Corp',
          push_notification_key: 'push-key-123',
          app_settings: {
            display_name: 'Test App',
            scopes: ['scope1', 'scope2']
          },
          fabric_addresses: [mockAddress]
        };

        user['populateInstance'](data);

        expect(user.id).toBe('sub-123');
        expect(user.email).toBe('test@example.com');
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
        expect(user.displayName).toBe('John Doe');
        expect(user.jobTitle).toBe('Software Engineer');
        expect(user.timeZone).toBe(-5);
        expect(user.country).toBe('US');
        expect(user.region).toBe('NY');
        expect(user.companyName).toBe('Acme Corp');
        expect(user.pushNotificationKey).toBe('push-key-123');
        expect(user.appSettings).toEqual({
          displayName: 'Test App',
          scopes: ['scope1', 'scope2']
        });
        expect(user.addresses).toEqual([mockAddress]);
      });

      it('should populate required fields only', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-456',
          email: 'minimal@example.com',
          push_notification_key: 'push-key-456',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.id).toBe('sub-456');
        expect(user.email).toBe('minimal@example.com');
        expect(user.pushNotificationKey).toBe('push-key-456');
        expect(user.addresses).toEqual([]);
        expect(user.firstName).toBeUndefined();
        expect(user.lastName).toBeUndefined();
        expect(user.displayName).toBeUndefined();
        expect(user.jobTitle).toBeUndefined();
        expect(user.timeZone).toBeUndefined();
        expect(user.country).toBeUndefined();
        expect(user.region).toBeUndefined();
        expect(user.companyName).toBeUndefined();
        expect(user.appSettings).toBeUndefined();
      });
    });

    describe('Happy path - optional fields', () => {
      it('should handle missing optional first_name', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.id).toBe('sub-789');
        expect(user.firstName).toBeUndefined();
      });

      it('should handle missing optional last_name', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.lastName).toBeUndefined();
      });

      it('should handle missing optional display_name', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.displayName).toBeUndefined();
      });

      it('should handle missing optional job_title', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.jobTitle).toBeUndefined();
      });

      it('should handle missing optional time_zone', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.timeZone).toBeUndefined();
      });

      it('should handle missing optional country', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.country).toBeUndefined();
      });

      it('should handle missing optional region', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.region).toBeUndefined();
      });

      it('should handle missing optional company_name', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.companyName).toBeUndefined();
      });

      it('should handle missing optional app_settings', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-789',
          email: 'test@example.com',
          push_notification_key: 'push-key-789',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.appSettings).toBeUndefined();
      });
    });

    describe('Happy path - appSettings mapping', () => {
      it('should correctly map app_settings to camelCase', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-999',
          email: 'test@example.com',
          push_notification_key: 'push-key-999',
          app_settings: {
            display_name: 'My Custom App',
            scopes: ['read', 'write', 'admin']
          },
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.appSettings).toEqual({
          displayName: 'My Custom App',
          scopes: ['read', 'write', 'admin']
        });
      });

      it('should handle app_settings with empty scopes array', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-999',
          email: 'test@example.com',
          push_notification_key: 'push-key-999',
          app_settings: {
            display_name: 'App With No Scopes',
            scopes: []
          },
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.appSettings).toEqual({
          displayName: 'App With No Scopes',
          scopes: []
        });
      });
    });

    describe('Happy path - fabricAddresses mapping', () => {
      it('should handle multiple fabric addresses', () => {
        const addresses: GetAddressResponse[] = [
          {
            id: 'addr-1',
            display_name: 'Address 1',
            name: 'addr-1',
            resource_id: 'res-1',
            type: 'subscriber',
            channels: { audio: 'audio-1' },
            locked: false,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'addr-2',
            display_name: 'Address 2',
            name: 'addr-2',
            resource_id: 'res-2',
            type: 'app',
            channels: { video: 'video-2' },
            locked: true,
            created_at: '2024-01-02T00:00:00Z'
          }
        ];

        const data: GetUserInfoResponse = {
          id: 'sub-multi',
          email: 'multi@example.com',
          push_notification_key: 'push-key-multi',
          fabric_addresses: addresses
        };

        user['populateInstance'](data);

        expect(user.addresses).toEqual(addresses);
        expect(user.addresses).toHaveLength(2);
      });

      it('should handle empty fabric addresses array', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-empty',
          email: 'empty@example.com',
          push_notification_key: 'push-key-empty',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.addresses).toEqual([]);
        expect(user.addresses).toHaveLength(0);
      });
    });

    describe('Edge cases - timeZone values', () => {
      it('should handle positive timezone', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-tz',
          email: 'tz@example.com',
          time_zone: 5,
          push_notification_key: 'push-key-tz',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.timeZone).toBe(5);
      });

      it('should handle negative timezone', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-tz',
          email: 'tz@example.com',
          time_zone: -8,
          push_notification_key: 'push-key-tz',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.timeZone).toBe(-8);
      });

      it('should handle zero timezone', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-tz',
          email: 'tz@example.com',
          time_zone: 0,
          push_notification_key: 'push-key-tz',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.timeZone).toBe(0);
      });
    });

    describe('Edge cases - special characters and unicode', () => {
      it('should handle special characters in string fields', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-special',
          email: 'test+tag@example.com',
          first_name: "O'Brien",
          last_name: 'Smith-Jones',
          display_name: 'Test & User',
          company_name: 'Acme & Co.',
          push_notification_key: 'push-key-special',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.email).toBe('test+tag@example.com');
        expect(user.firstName).toBe("O'Brien");
        expect(user.lastName).toBe('Smith-Jones');
        expect(user.displayName).toBe('Test & User');
        expect(user.companyName).toBe('Acme & Co.');
      });

      it('should handle unicode characters', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-unicode',
          email: 'test@例え.jp',
          first_name: 'José',
          last_name: 'Müller',
          display_name: '测试用户',
          push_notification_key: 'push-key-unicode',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.email).toBe('test@例え.jp');
        expect(user.firstName).toBe('José');
        expect(user.lastName).toBe('Müller');
        expect(user.displayName).toBe('测试用户');
      });
    });

    describe('Edge cases - empty strings', () => {
      it('should handle empty string values', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-empty-strings',
          email: 'test@example.com',
          first_name: '',
          last_name: '',
          display_name: '',
          push_notification_key: 'push-key-empty',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.firstName).toBe('');
        expect(user.lastName).toBe('');
        expect(user.displayName).toBe('');
      });
    });

    describe('Type safety', () => {
      it('should maintain correct types for all properties', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-types',
          email: 'types@example.com',
          first_name: 'Type',
          last_name: 'Test',
          time_zone: -5,
          push_notification_key: 'push-key-types',
          app_settings: {
            display_name: 'Test',
            scopes: ['scope1']
          },
          fabric_addresses: []
        };

        user['populateInstance'](data);

        // Type assertions to ensure correct types
        const id: string = user.id;
        const email: string = user.email;
        const firstName: string | undefined = user.firstName;
        const lastName: string | undefined = user.lastName;
        const timeZone: number | undefined = user.timeZone;
        const pushKey: string = user.pushNotificationKey;
        const appSettings: { displayName: string; scopes: string[] } | undefined =
          user.appSettings;
        const addresses: GetAddressResponse[] = user.addresses;

        expect(typeof id).toBe('string');
        expect(typeof email).toBe('string');
        expect(typeof firstName).toBe('string');
        expect(typeof lastName).toBe('string');
        expect(typeof timeZone).toBe('number');
        expect(typeof pushKey).toBe('string');
        expect(typeof appSettings).toBe('object');
        expect(Array.isArray(addresses)).toBe(true);
      });
    });

    describe('satClaims mapping', () => {
      it('should set satClaims when sat_claims contains scope and cnf', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-sat-1',
          email: 'sat@example.com',
          push_notification_key: 'push-key-sat-1',
          fabric_addresses: [],
          sat_claims: {
            scope: ['sat:refresh', 'sat:call'],
            cnf: { jkt: 'thumbprint-abc123' }
          }
        };

        user['populateInstance'](data);

        expect(user.satClaims).toEqual({
          scope: ['sat:refresh', 'sat:call'],
          cnf: { jkt: 'thumbprint-abc123' }
        });
      });

      it('should set satClaims with just scope when cnf is absent', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-sat-2',
          email: 'sat-scope@example.com',
          push_notification_key: 'push-key-sat-2',
          fabric_addresses: [],
          sat_claims: {
            scope: ['sat:refresh']
          }
        };

        user['populateInstance'](data);

        expect(user.satClaims).toEqual({
          scope: ['sat:refresh']
        });
        expect(user.satClaims?.cnf).toBeUndefined();
      });

      it('should leave satClaims undefined when sat_claims is absent', () => {
        const data: GetUserInfoResponse = {
          id: 'sub-sat-3',
          email: 'no-sat@example.com',
          push_notification_key: 'push-key-sat-3',
          fabric_addresses: []
        };

        user['populateInstance'](data);

        expect(user.satClaims).toBeUndefined();
      });

      it('should set satClaims with expires_at when present', () => {
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const data: GetUserInfoResponse = {
          id: 'sub-sat-4',
          email: 'sat-expiry@example.com',
          push_notification_key: 'push-key-sat-4',
          fabric_addresses: [],
          sat_claims: {
            scope: ['sat:refresh'],
            cnf: { jkt: 'thumbprint-xyz789' },
            expires_at: expiresAt
          }
        };

        user['populateInstance'](data);

        expect(user.satClaims).toBeDefined();
        expect(user.satClaims?.expires_at).toBe(expiresAt);
        expect(user.satClaims?.scope).toEqual(['sat:refresh']);
        expect(user.satClaims?.cnf).toEqual({ jkt: 'thumbprint-xyz789' });
      });
    });

    describe('Re-population', () => {
      it('should correctly update properties when populateInstance is called multiple times', () => {
        const data1: GetUserInfoResponse = {
          id: 'sub-first',
          email: 'first@example.com',
          first_name: 'First',
          push_notification_key: 'push-key-first',
          fabric_addresses: []
        };

        const data2: GetUserInfoResponse = {
          id: 'sub-second',
          email: 'second@example.com',
          first_name: 'Second',
          last_name: 'User',
          push_notification_key: 'push-key-second',
          fabric_addresses: []
        };

        user['populateInstance'](data1);
        expect(user.id).toBe('sub-first');
        expect(user.firstName).toBe('First');
        expect(user.lastName).toBeUndefined();

        user['populateInstance'](data2);
        expect(user.id).toBe('sub-second');
        expect(user.firstName).toBe('Second');
        expect(user.lastName).toBe('User');
      });

      it('should clear optional fields when re-populated with data missing those fields', () => {
        const dataWithOptional: GetUserInfoResponse = {
          id: 'sub-with',
          email: 'with@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Acme',
          push_notification_key: 'push-key-with',
          fabric_addresses: []
        };

        const dataWithoutOptional: GetUserInfoResponse = {
          id: 'sub-without',
          email: 'without@example.com',
          push_notification_key: 'push-key-without',
          fabric_addresses: []
        };

        user['populateInstance'](dataWithOptional);
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
        expect(user.companyName).toBe('Acme');

        user['populateInstance'](dataWithoutOptional);
        expect(user.firstName).toBeUndefined();
        expect(user.lastName).toBeUndefined();
        expect(user.companyName).toBeUndefined();
      });
    });
  });

  describe('constructor', () => {
    it('should set the correct API endpoint path', () => {
      const user = new User();
      expect(user.fromPath).toBe('/api/fabric/subscriber/info');
    });

    it('should extend Fetchable', () => {
      const user = new User();
      expect(user).toHaveProperty('fetched$');
      expect(user).toHaveProperty('fromPath');
    });
  });
});
