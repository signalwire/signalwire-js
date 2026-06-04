# Integration Tests

This directory contains integration tests that make real HTTP requests to SignalWire APIs.

## Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp tests/integration/.env.example tests/integration/.env
   ```

2. Fill in your actual SignalWire credentials in the `.env` file.

## Running Integration Tests

### All Integration Tests
```bash
npm test -- tests/integration/
```

### Specific Integration Test Files

#### Session Integration Test
Tests the full SignalWire client session lifecycle:
```bash
npm test -- tests/integration/session.spec.ts
```

#### HTTPRequestManager Integration Test
Tests the HTTPRequestManager making GET requests to the SignalWire Fabric API:
```bash
npm test -- tests/integration/http-request-manager.spec.ts
```

## HTTPRequestManager Integration Test

The `http-request-manager.spec.ts` test verifies that the HTTPRequestManager can:

- Make GET requests to `https://fabric.signalwire.com/api/fabric/subscriber/info`
- Authenticate using a Bearer token (from `SW_EXISTING_SUBSCRIBER_TOKEN`)
- Handle absolute URLs
- Emit responses through the `responses$` observable
- Update status through the `status$` observable

### Prerequisites

You need a valid subscriber token set in your `.env` file:
```env
SW_EXISTING_SUBSCRIBER_TOKEN=your-valid-token-here
```

### Getting a Valid Token

If you don't have a valid subscriber token, you can:

1. Run the session integration test first to create one:
   ```bash
   npm test -- tests/integration/session.spec.ts
   ```

2. Or use the SignalWire API to create a subscriber token:
   ```bash
   curl -X POST https://<your-space>.signalwire.com/api/fabric/subscribers/tokens \
     -H "Content-Type: application/json" \
     -H "Authorization: Basic $(echo -n '<project-id>:<project-token>' | base64)" \
     -d '{"reference": "your-subscriber-reference", "password": "your-password"}'
   ```

### Expected Output

When the test runs successfully with a valid token, you should see:

```
✓ should GET subscriber info from SignalWire Fabric API
✓ should emit response through responses$ observable
✓ should update status$ observable during request lifecycle
✓ should handle absolute URLs correctly
✓ should include Authorization header with Bearer token
```

The test will also log the full subscriber information returned by the API.

### Troubleshooting

**401 Unauthorized Error**
- Your `SW_EXISTING_SUBSCRIBER_TOKEN` may be expired or invalid
- Subscriber tokens typically expire after a certain period
- Generate a new token and update your `.env` file

**Network Errors**
- Check your internet connection
- Verify that `https://fabric.signalwire.com` is accessible
- Check firewall settings

**Environment Variable Not Found**
- Ensure `.env` file exists in `tests/integration/`
- Verify that `SW_EXISTING_SUBSCRIBER_TOKEN` is set and not empty
