// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { HTTPRequestManager } from '../../src/managers/HTTPRequestManager';
import type { HTTPRequest, SDKCredential } from '../../src/core/interfaces';
import { loadEnv } from '../utils/loadEnv';

// Load environment variables before tests
loadEnv();

describe('HTTPRequestManager Integration Test', () => {
  let subscriberToken: string;
  let httpManager: HTTPRequestManager;

  beforeAll(() => {
    // Validate required environment variables
    const existingToken = process.env.SW_EXISTING_SUBSCRIBER_TOKEN;

    if (!existingToken || existingToken.length === 0) {
      throw new Error(
        'SW_EXISTING_SUBSCRIBER_TOKEN is required for this integration test. ' +
        'Please set it in tests/integration/.env'
      );
    }

    subscriberToken = existingToken;

    // Create HTTPRequestManager with the subscriber token
    const credential: SDKCredential = {
      token: subscriberToken,
    };

    httpManager = new HTTPRequestManager(
      'https://fabric.signalwire.com',
      credential,
      {
        maxRetries: 3,
        retryDelayMin: 1000,
        retryDelayMax: 5000,
        requestTimeout: 10000,
      }
    );
  });

  it('should GET subscriber info from SignalWire Fabric API', async () => {
    const request: HTTPRequest = {
      method: 'GET',
      url: '/api/fabric/subscriber/info',
    };

    console.log('Making GET request to https://fabric.signalwire.com/api/fabric/subscriber/info');

    const response = await httpManager.request(request);

    // Validate response structure
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.statusText).toBeDefined();
    expect(response.headers).toBeDefined();
    expect(response.body).toBeDefined();

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Response body:', response.body);

    // Parse response body
    const subscriberInfo = JSON.parse(response.body);
    expect(subscriberInfo).toBeDefined();
    expect(typeof subscriberInfo).toBe('object');

    // Validate subscriber info structure (adjust based on actual API response)
    // Common fields that might be present in subscriber info
    if (subscriberInfo.id) {
      expect(typeof subscriberInfo.id).toBe('string');
      console.log('Subscriber ID:', subscriberInfo.id);
    }

    if (subscriberInfo.email) {
      expect(typeof subscriberInfo.email).toBe('string');
      console.log('Subscriber email:', subscriberInfo.email);
    }

    if (subscriberInfo.reference) {
      expect(typeof subscriberInfo.reference).toBe('string');
      console.log('Subscriber reference:', subscriberInfo.reference);
    }

    console.log('Full subscriber info:', JSON.stringify(subscriberInfo, null, 2));
  }, 15000);

  it('should emit response through responses$ observable', async () => {
    const responses: any[] = [];
    const subscription = httpManager.responses$.subscribe((response) => {
      responses.push(response);
    });

    const request: HTTPRequest = {
      method: 'GET',
      url: '/api/fabric/subscriber/info',
    };

    await httpManager.request(request);

    // Wait a bit for the observable to emit
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(responses.length).toBeGreaterThan(0);
    expect(responses[0].status).toBe(200);
    expect(responses[0].ok).toBe(true);

    subscription.unsubscribe();
  }, 15000);

  it('should update status$ observable during request lifecycle', async () => {
    const statuses: string[] = [];
    const subscription = httpManager.status$.subscribe((status) => {
      statuses.push(status);
    });

    const request: HTTPRequest = {
      method: 'GET',
      url: '/api/fabric/subscriber/info',
    };

    await httpManager.request(request);

    // Status should transition: idle -> requesting -> success
    expect(statuses).toContain('requesting');
    expect(statuses).toContain('success');
    expect(httpManager.status).toBe('success');

    subscription.unsubscribe();
  }, 15000);

  it('should handle absolute URLs correctly', async () => {
    const request: HTTPRequest = {
      method: 'GET',
      url: 'https://fabric.signalwire.com/api/fabric/subscriber/info',
    };

    const response = await httpManager.request(request);

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  }, 15000);

  it('should include Authorization header with Bearer token', async () => {
    // This test verifies that the HTTPRequestManager adds the correct auth header
    // We can verify this by checking that the request succeeds with authentication
    const request: HTTPRequest = {
      method: 'GET',
      url: '/api/fabric/subscriber/info',
    };

    const response = await httpManager.request(request);

    // If authentication failed, we'd get a 401 status
    expect(response.status).not.toBe(401);
    expect(response.status).toBe(200);
  }, 15000);
});
