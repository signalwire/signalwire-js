# Task Request: Implement ClientFactory Playground Demo

## Task Overview
Implement a new playground demo that showcases the ClientFactory API for managing multiple SignalWire client instances with profile-based authentication. This demo will replace token-based authentication with a profile management system, allowing users to maintain multiple concurrent client connections and switch between them seamlessly.

## Objectives
1. Create a functional demo that demonstrates ClientFactory profile management capabilities
2. Enable users to add multiple authentication profiles from JSON credentials
3. Provide UI for selecting and switching between active client instances
4. Implement call functionality (dial, execute, hangup) using the selected client
5. Maintain multiple concurrent connections without disconnecting when switching profiles

## Technical Requirements

### 1. File Structure
Create the following files in `/home/jpsantos/Development/signalwire/sdk-client-factory/internal/playground-client/src/fabric-clientfactory/`:
- `index.html` - Main HTML file with UI components
- `index.js` - JavaScript implementation using ClientFactory API

### 2. Core Functionality

#### 2.1 Profile Management
- **Profile Creation**:
  - UI component to paste JSON credentials
  - Parse JSON and validate required fields: `satToken`, `tokenExpiry`, `satRefreshURL`, `satRefreshPayload`, `satRefreshResultMapper`
  - Handle `satRefreshResultMapper` as a string that needs to be evaluated as a function
  - Use ClientFactory to create profiles from credentials
  - Each credential may create multiple profiles (one per address)
  - Persist profiles using SignalWireStorageContract (localStorage)

- **Profile Display**:
  - List all created profiles showing addressId and display name
  - Visual indicator for selected/active profile
  - Option to remove profiles from the list

- **Client Selection**:
  - Dropdown/selector to choose active profile
  - Get client instance for selected profile using ClientFactory.getClient()
  - Update UI to show current active client information
  - Maintain all connections (no disconnect on switch)

#### 2.2 Call Operations (from fabric-http baseline)
- **Address Directory**:
  - Fetch and display available addresses
  - Search/filter functionality
  - Pagination support

- **Calling Features**:
  - Dial to address (audio/video)
  - Execute method during call
  - Hangup active call
  - Only selected client can initiate new calls

- **History Tab**:
  - Display call history
  - Conversation/messaging logs

#### 2.3 UI Components

**Top Section - Profile Management**:
```html
<!-- Profile Creation Card -->
- JSON credential input textarea
- "Add Profile(s)" button
- Validation feedback messages

<!-- Profile List Card -->
- List of profiles with:
  - Profile ID
  - Address ID
  - Display Name
  - Remove button
  - Selection indicator

<!-- Active Client Selector -->
- Dropdown showing all profiles
- Current client status indicator
```

**Main Section - Call Operations**:
```html
<!-- Similar to fabric-http -->
- Directory/History tabs
- Address list with call buttons
- Search and filters
- Conversation logs
```

### 3. Implementation Details

#### 3.1 ClientFactory Integration
```javascript
import { ClientFactory } from '@signalwire/client'

// Initialize ClientFactory with localStorage
const factory = new ClientFactory()
await factory.init() // Will use default localStorage

// Add profiles from JSON credentials
const profiles = await factory.addProfiles({
  profiles: parsedProfiles
})

// Get client for selected profile
const { instance } = await factory.getClient({ 
  profileId: selectedProfileId 
})
const client = instance.client

// List active clients
const activeClients = await factory.listActiveClients()
```

#### 3.2 Profile Creation from JSON
```javascript
function parseCredentials(jsonString) {
  const creds = JSON.parse(jsonString)
  
  // Evaluate satRefreshResultMapper string as function
  if (typeof creds.satRefreshResultMapper === 'string') {
    creds.satRefreshResultMapper = eval(`(${creds.satRefreshResultMapper})`)
  }
  
  // Return profile-ready format
  return {
    type: 'static',
    credentialsId: generateCredentialId(),
    credentials: creds,
    addressDetails: { /* populated after fetching addresses */ }
  }
}
```

#### 3.3 Error Handling
- **Invalid JSON**: Show clear error message, highlight input field
- **Missing Required Fields**: List missing fields in error message
- **Authentication Failure**: Prompt to remove profile and retry
- **Token Refresh Failure**: Alert user, suggest profile recreation
- **Connection Issues**: Display connection status per profile

### 4. Acceptance Criteria

#### 4.1 Profile Management
- [ ] Users can paste JSON credentials and create profiles
- [ ] All profiles are persisted in localStorage
- [ ] Profile list displays all created profiles with relevant information
- [ ] Users can remove profiles from the list
- [ ] Profiles persist across page refreshes

#### 4.2 Client Management
- [ ] Users can select any profile from dropdown
- [ ] Client instance is created/retrieved for selected profile
- [ ] Multiple clients remain connected simultaneously
- [ ] Client switching does not disconnect other clients
- [ ] Active client indicator is clearly visible

#### 4.3 Call Functionality
- [ ] Selected client can fetch and display addresses
- [ ] Search and filter work correctly
- [ ] Dial functionality works for audio/video calls
- [ ] Only selected client can initiate new calls
- [ ] Call controls (execute, hangup) work correctly
- [ ] History and conversation logs are displayed

#### 4.4 Error Handling
- [ ] Invalid JSON shows helpful error message
- [ ] Missing credential fields are clearly indicated
- [ ] Authentication failures provide actionable feedback
- [ ] Token refresh errors are handled gracefully
- [ ] Network/connection issues are visible to user

#### 4.5 UI/UX
- [ ] Profile management UI is intuitive and clear
- [ ] Active client is visually distinguished
- [ ] All interactive elements provide feedback
- [ ] Error messages are user-friendly
- [ ] Loading states are shown during async operations

### 5. Testing Requirements
- [ ] Test with valid JSON credentials
- [ ] Test with invalid/malformed JSON
- [ ] Test with missing required fields
- [ ] Test profile persistence across refreshes
- [ ] Test multiple simultaneous connections
- [ ] Test client switching without disconnection
- [ ] Test all call operations (dial, execute, hangup)
- [ ] Test error scenarios and recovery

### 6. Development Constraints
- Must run within existing playground-client infrastructure
- Use existing Bootstrap 5.3.2 and Bootstrap Icons
- Follow patterns from fabric-http demo where applicable
- Maintain compatibility with @signalwire/client package
- Use standard JavaScript modules (no bundler required)

### 7. Deliverables
1. **index.html**: Complete HTML structure with Bootstrap styling
2. **index.js**: Full JavaScript implementation with ClientFactory
3. **Working Demo**: Functional profile management and calling features
4. **Error Handling**: Comprehensive error handling with user feedback
5. **Documentation**: Inline comments explaining key functionality

## Completion Report Requirements
Upon completion, provide a report that includes:
1. Summary of work performed
2. List of all files created/modified
3. Verification that all acceptance criteria are met
4. Any obstacles encountered and how they were resolved
5. Testing performed and results
6. Any deviations from requirements and justification

## Priority Order
1. Profile management UI and ClientFactory integration
2. Profile persistence with localStorage
3. Client instance creation and switching
4. Basic call operations (dial, hangup)
5. Address directory and search
6. Error handling and user feedback
7. History and conversation features

## Notes
- The demo should be self-contained and work with the existing playground-client dev server
- Focus on demonstrating ClientFactory capabilities over aesthetic polish
- Ensure all async operations show appropriate loading states
- Maintain clear separation between profile management and call operations
- Consider adding helpful tooltips or instructions for first-time users