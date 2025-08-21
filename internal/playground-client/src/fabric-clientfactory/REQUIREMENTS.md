# ClientFactory Playground Demo Requirements

## Overview

Create a new playground-client demo based on `@internal/playground-client/src/fabric-http` but using the ClientFactory API for authentication and client management.

## Requirements

### 1. Authentication & Profile Management

- **Profile Creation UI**:
  - Add a component at the top of the page to paste JSON credentials
  - Parse the JSON and create profiles using ClientFactory API
  - A single JSON credential will create multiple profiles (one for each address associated with the token)
  - Profiles are persisted in localStorage using SignalWireStorageContract
  - Show list of added profiles displaying addressId and display name

- **Client Selection**:
  - Dropdown/selector to choose from available profiles
  - Get a new client instance when selecting a profile
  - Maintain multiple active client connections simultaneously (no disconnect on switch)
  - Only the selected client can dial new calls
  - This replaces the need to paste a token before connecting

### 2. Core Functionality (from fabric-http)

- **Execute Calls**:
  - Start a call to a destination address
  - Execute method in a call
  - Hangup the call

### 3. Technical Implementation

- Start with similar functionality as fabric-http but with improved UI for profile management
- Use `ClientFactory` from `@signalwire/client`
- Implement proper profile management with ProfileManager
- Instantiate new client using the `ClientFactory`
- Each profile has a single unique address (credentials can have multiple addresses)
- Run within existing playground-client dev server setup

### 4. JSON Credentials Format

The credentials JSON should include:

```json
{
  "satToken": "string",
  "tokenExpiry": "number",
  "satRefreshURL": "string",
  "satRefreshPayload": {},
  "satRefreshResultMapper": "function as string"
}
```

Note: The `satRefreshResultMapper` is a JavaScript function as a string that will be evaluated to handle token refresh responses.

### 5. Error Handling

- **Invalid JSON credentials**: Display message to user to try with new credentials
- **Failed authentication**: Tell user to remove the profile and try again
- **Token refresh failures**: Tell user to remove the profile and try again

### 6. File Structure

```
fabric-clientfactory/
├── index.html
├── index.js
└── REQUIREMENTS.md
```
