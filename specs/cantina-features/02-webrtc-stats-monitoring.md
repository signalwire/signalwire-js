# WebRTC Stats Monitoring - Technical Specification

## Feature Overview

The WebRTC Stats Monitoring feature provides comprehensive real-time monitoring and automatic recovery capabilities for WebRTC peer connections in the @signalwire/webrtc package. This feature automatically detects network issues, media quality problems, and connection failures, then implements a three-tier response system to maintain call quality.

### Key Features

- **Real-time Statistics Collection**: Continuous monitoring of WebRTC stats including packet loss, RTT, jitter, and connection states
- **Intelligent Issue Detection**: Algorithm-based detection of network quality degradation and connection issues
- **Three-Tier Recovery System**: Graduated response from warnings to keyframe requests to ICE restart
- **Baseline Establishment**: Dynamic baseline calculation for network conditions to detect relative degradation
- **Cross-platform Support**: Optimized polling intervals for mobile and desktop platforms

## Problem Statement

WebRTC applications suffer from various network-related issues that can severely impact call quality:

1. **Packet Loss**: Network congestion causing media packet drops
2. **High Latency**: Increased round-trip time affecting real-time communication
3. **Jitter**: Inconsistent packet delivery timing causing audio/video stuttering
4. **ICE Failures**: Connection state changes and ICE disconnections
5. **Media Interruptions**: Complete loss of inbound media packets
6. **Limited Visibility**: Lack of proactive monitoring and automated recovery

### Current Limitations

The existing `watchRTCPeerMediaPackets` utility only monitors basic packet reception but lacks:

- Comprehensive network quality metrics
- Proactive issue detection
- Automated recovery mechanisms
- Baseline comparison for relative performance assessment
- Integration with application-level error handling

## Proposed Solution

Implement a comprehensive WebRTC Stats Monitor that:

1. **Continuously collects** detailed WebRTC statistics
2. **Establishes baselines** for normal network performance
3. **Detects issues** using configurable thresholds and algorithms
4. **Implements recovery** through a three-tier response system
5. **Integrates seamlessly** with existing RTCPeer and BaseConnection components
6. **Provides observability** through events and metrics for application monitoring

## Technical Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    WebRTC Stats Monitor                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Stats         │  │   Issue         │  │   Recovery      │ │
│  │   Collector     │  │   Detector      │  │   Manager       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Baseline      │  │   Metrics       │  │   Event         │ │
│  │   Manager       │  │   History       │  │   Emitter       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ Integration
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      RTCPeer                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐                    ┌─────────────────┐   │
│  │ RTCPeerConnection│                    │   Event Handlers│   │
│  │ Management      │ ←──────────────────→ │  & Callbacks    │   │
│  └─────────────────┘                    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ Usage
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BaseConnection                               │
├─────────────────────────────────────────────────────────────────┤
│  Call Management, Signaling, Media Stream Handling             │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
packages/webrtc/src/
├── monitoring/
│   ├── WebRTCStatsMonitor.ts          # Core monitoring class
│   ├── IssueDetector.ts               # Issue detection algorithms
│   ├── RecoveryManager.ts             # Recovery mechanisms
│   ├── BaselineManager.ts             # Baseline establishment
│   ├── MetricsCollector.ts            # Stats collection
│   ├── interfaces.ts                  # Type definitions
│   └── constants.ts                   # Monitoring constants
├── RTCPeer.ts                         # Enhanced with monitoring
├── BaseConnection.ts                  # Integration point
└── workers/
    └── statsMonitorWorker.ts          # Redux saga worker
```

## Metrics Collection Strategy

### Core Statistics

The monitor collects the following WebRTC statistics:

#### Inbound RTP Statistics

```typescript
interface InboundRTPStats {
  packetsReceived: number
  packetsLost: number
  bytesReceived: number
  jitter: number
  lastPacketReceivedTimestamp: number
}
```

#### Connection Statistics

```typescript
interface ConnectionStats {
  currentRoundTripTime: number
  availableIncomingBitrate: number
  availableOutgoingBitrate: number
  connectionState: RTCPeerConnectionState
  iceConnectionState: RTCIceConnectionState
}
```

#### Computed Metrics

```typescript
interface ComputedMetrics {
  packetLossRate: number
  rttSpike: number
  jitterSpike: number
  noPacketsDuration: number
}
```

### Collection Process

1. **Polling Interval**: 1000ms (desktop), 500ms (mobile)
2. **History Retention**: 30 seconds of metrics history
3. **Baseline Window**: First 5 seconds for establishing baseline
4. **Statistics Sources**:
   - `inbound-rtp` reports for audio/video
   - `candidate-pair` reports for connection metrics
   - Connection state events

### Adaptive Polling

```typescript
class AdaptivePollManager {
  private getPollingInterval(): number {
    const isMobile = this.detectMobile()
    const hasIssues = this.activeIssues.size > 0

    if (hasIssues) {
      return isMobile ? 300 : 500 // Faster polling during issues
    }

    return isMobile ? 500 : 1000 // Normal polling
  }
}
```

## Issue Detection Algorithms

### Threshold-Based Detection

#### No Inbound Packets

```typescript
const NO_PACKET_THRESHOLD_MS = 2000

function detectNoPackets(metrics: StatsMetrics): NetworkIssue[] {
  const timeSinceLastPacket = Date.now() - this.lastPacketTime

  if (timeSinceLastPacket > NO_PACKET_THRESHOLD_MS) {
    return [
      {
        type: NetworkIssueType.NO_INBOUND_PACKETS,
        severity: timeSinceLastPacket > 5000 ? 'critical' : 'warning',
        timestamp: Date.now(),
        value: timeSinceLastPacket,
      },
    ]
  }

  return []
}
```

#### RTT Spike Detection

```typescript
const RTT_SPIKE_MULTIPLIER = 3

function detectRTTSpike(
  current: StatsMetrics,
  baseline: Baseline
): NetworkIssue[] {
  if (current.roundTripTime > baseline.rtt * RTT_SPIKE_MULTIPLIER) {
    return [
      {
        type: NetworkIssueType.HIGH_RTT,
        severity:
          current.roundTripTime > baseline.rtt * 5 ? 'critical' : 'warning',
        timestamp: Date.now(),
        value: current.roundTripTime,
      },
    ]
  }

  return []
}
```

#### Packet Loss Detection

```typescript
const PACKET_LOSS_THRESHOLD = 0.05 // 5%

function detectPacketLoss(
  current: StatsMetrics,
  previous: StatsMetrics
): NetworkIssue[] {
  const packetsReceived = current.packetsReceived - previous.packetsReceived
  const packetsLost = current.packetsLost - previous.packetsLost
  const total = packetsReceived + packetsLost

  if (total > 0) {
    const lossRate = packetsLost / total

    if (lossRate > PACKET_LOSS_THRESHOLD) {
      return [
        {
          type: NetworkIssueType.HIGH_PACKET_LOSS,
          severity: lossRate > 0.1 ? 'critical' : 'warning',
          timestamp: Date.now(),
          value: lossRate,
        },
      ]
    }
  }

  return []
}
```

#### Jitter Spike Detection

```typescript
const JITTER_SPIKE_MULTIPLIER = 4

function detectJitterSpike(
  current: StatsMetrics,
  baseline: Baseline
): NetworkIssue[] {
  if (current.jitter > baseline.jitter * JITTER_SPIKE_MULTIPLIER) {
    return [
      {
        type: NetworkIssueType.HIGH_JITTER,
        severity: 'warning',
        timestamp: Date.now(),
        value: current.jitter,
      },
    ]
  }

  return []
}
```

### Connection State Monitoring

```typescript
function monitorConnectionStates(): void {
  this.peerConnection.addEventListener('connectionstatechange', () => {
    const state = this.peerConnection.connectionState

    if (state === 'disconnected' || state === 'failed') {
      this.addIssue({
        type: NetworkIssueType.ICE_DISCONNECTED,
        severity: state === 'failed' ? 'critical' : 'warning',
        timestamp: Date.now(),
      })
    }
  })

  this.peerConnection.addEventListener('iceconnectionstatechange', () => {
    const state = this.peerConnection.iceConnectionState

    if (state === 'disconnected' || state === 'failed') {
      this.addIssue({
        type: NetworkIssueType.ICE_DISCONNECTED,
        severity: state === 'failed' ? 'critical' : 'warning',
        timestamp: Date.now(),
      })
    }
  })
}
```

## Recovery Mechanisms

### Three-Tier Response System

The recovery system implements a graduated response based on issue severity and count:

#### Tier 1: Warning Level

**Trigger**: 1+ warning issues
**Actions**:

- Log issue for monitoring
- Update network quality metrics
- No active intervention

```typescript
function handleWarningTier(issues: NetworkIssue[]): void {
  console.debug('Network quality warning detected', issues)

  this.emit('networkQualityWarning', {
    issues,
    metrics: this.getLatestMetrics(),
  })
}
```

#### Tier 2: Recovery Level

**Trigger**: 1+ critical issues OR 2+ warning issues
**Actions**:

- Request video keyframe (if video call)
- Attempt media track recovery
- Enhanced logging

```typescript
function handleRecoveryTier(issues: NetworkIssue[]): void {
  console.warn('Network quality degraded, attempting recovery', issues)

  // Only request keyframe if we have video
  if (this.hasVideoTrack() && !this.isAudioOnlyCall()) {
    this.requestKeyframe()
  }

  this.emit('networkQualityDegraded', {
    issues,
    recoveryActions: ['keyframe_request'],
  })
}
```

#### Tier 3: ICE Restart Level

**Trigger**: 3+ critical issues OR (1+ critical + 2+ warnings)
**Actions**:

- Full ICE restart through reinvite
- Complete renegotiation
- Fallback connection attempt

```typescript
function handleICERestartTier(issues: NetworkIssue[]): void {
  console.error('Network quality critical, triggering ICE restart', issues)

  // Special handling for extended no-packets scenario
  const noPacketsIssue = issues.find(
    (i) => i.type === NetworkIssueType.NO_INBOUND_PACKETS
  )
  if (noPacketsIssue && noPacketsIssue.value > 3000) {
    this.triggerReinvite('no_packets')
  } else {
    this.triggerReinvite('network_issue')
  }

  this.emit('networkQualityCritical', {
    issues,
    recoveryActions: ['ice_restart', 'reinvite'],
  })
}
```

### Recovery Action Implementation

#### Keyframe Request

```typescript
async requestKeyframe(): Promise<void> {
  try {
    const sender = this.getVideoSender()
    if (sender && sender.track) {
      await sender.generateKeyFrame?.()
      // Fallback to RTCPeer method if available
      this.rtcPeer.call.emit('keyframe-request', {
        callId: this.rtcPeer.call.id
      })
    }
  } catch (error) {
    console.error('Failed to request keyframe:', error)
  }
}
```

#### ICE Restart

```typescript
async triggerICERestart(): Promise<void> {
  try {
    // Mark as restarting to prevent multiple attempts
    if (this.isRestartingICE) return

    this.isRestartingICE = true

    // Trigger renegotiation with ICE restart
    await this.rtcPeer.call.renegotiate({
      iceRestart: true,
      reason: 'network_quality_issue'
    })

  } catch (error) {
    console.error('ICE restart failed:', error)
    throw error
  } finally {
    this.isRestartingICE = false
  }
}
```

### Debouncing and Rate Limiting

```typescript
class RecoveryManager {
  private recoveryAttempts = new Map<string, RecoveryAttemptInfo>()
  private readonly RECOVERY_DEBOUNCE_MS = 10000
  private readonly MAX_RECOVERY_ATTEMPTS = 3

  canAttemptRecovery(type: RecoveryType): boolean {
    const attempts = this.recoveryAttempts.get(type) || {
      count: 0,
      lastAttempt: 0,
    }
    const now = Date.now()

    // Check debounce time
    if (now - attempts.lastAttempt < this.RECOVERY_DEBOUNCE_MS) {
      return false
    }

    // Check max attempts
    if (attempts.count >= this.MAX_RECOVERY_ATTEMPTS) {
      return false
    }

    return true
  }

  recordRecoveryAttempt(type: RecoveryType): void {
    const attempts = this.recoveryAttempts.get(type) || {
      count: 0,
      lastAttempt: 0,
    }
    attempts.count += 1
    attempts.lastAttempt = Date.now()
    this.recoveryAttempts.set(type, attempts)
  }
}
```

## Integration with RTCPeer.js

### Enhanced RTCPeer Class

The RTCPeer class will be enhanced with monitoring capabilities:

```typescript
// Enhanced RTCPeer with monitoring
export default class RTCPeer<EventTypes extends EventEmitter.ValidEventTypes> {
  // ... existing properties

  private _statsMonitor?: WebRTCStatsMonitor
  private _monitoringEnabled = false

  // Enhanced constructor
  constructor(call: BaseConnection<EventTypes>, type: RTCSdpType) {
    // ... existing constructor logic

    // Initialize monitoring if enabled
    if (this.options.enableStatsMonitoring !== false) {
      this._initializeStatsMonitoring()
    }
  }

  private _initializeStatsMonitoring(): void {
    this._statsMonitor = new WebRTCStatsMonitor({
      onIssuesDetected: (issues) => this._handleNetworkIssues(issues),
      pollInterval: this.options.statsPollInterval,
      enableRecovery: this.options.enableAutoRecovery !== false,
    })
  }

  private _handleNetworkIssues(issues: NetworkIssue[]): void {
    // Emit events for application handling
    this.call.emit('networkQualityChanged', {
      callId: this.call.id,
      issues,
      isHealthy: issues.filter((i) => i.severity === 'critical').length === 0,
    })

    // Handle automatic recovery if enabled
    if (this.options.enableAutoRecovery !== false) {
      this._statsMonitor.handleRecovery(issues)
    }
  }

  // Public methods for monitoring control
  public startStatsMonitoring(): void {
    if (this._statsMonitor && this.instance) {
      this._statsMonitor.start(this.instance)
      this._monitoringEnabled = true
    }
  }

  public stopStatsMonitoring(): void {
    if (this._statsMonitor) {
      this._statsMonitor.stop()
      this._monitoringEnabled = false
    }
  }

  public getNetworkQuality(): NetworkQuality | null {
    return this._statsMonitor?.getNetworkQuality() || null
  }

  public getStatsHistory(): StatsMetrics[] {
    return this._statsMonitor?.getMetricsHistory() || []
  }

  // Integration with existing methods
  async start(): Promise<unknown> {
    const result = await super.start()

    // Start monitoring after peer connection is established
    if (this.instance && this._statsMonitor) {
      // Delay to allow connection to stabilize
      setTimeout(() => this.startStatsMonitoring(), 2000)
    }

    return result
  }

  destroy(): void {
    this.stopStatsMonitoring()
    super.destroy()
  }
}
```

### BaseConnection Integration

The BaseConnection class will integrate with the enhanced RTCPeer:

```typescript
export class BaseConnection<
  EventTypes extends EventEmitter.ValidEventTypes = BaseConnectionEvents
> {
  // ... existing properties

  private _networkQuality?: NetworkQuality

  // Network quality getter
  get networkQuality(): NetworkQuality | null {
    const peer = this.peer
    return peer?.getNetworkQuality() || null
  }

  // Enhanced peer event handling
  protected _onPeerCreated(peer: RTCPeer<EventTypes>): void {
    // ... existing logic

    // Listen for network quality events
    peer.call.on(
      'networkQualityChanged',
      this._onNetworkQualityChanged.bind(this)
    )
  }

  private _onNetworkQualityChanged(event: NetworkQualityEvent): void {
    this._networkQuality = {
      isHealthy: event.isHealthy,
      lastUpdateTime: Date.now(),
      activeIssues: event.issues,
      metrics: this.peer?.getStatsHistory().slice(-1)[0],
    }

    // Emit for application consumption
    this.emit('networkQualityChanged', {
      networkQuality: this._networkQuality,
      callId: this.id,
    })
  }

  // Public API methods
  public getNetworkQuality(): NetworkQuality | null {
    return this._networkQuality || null
  }

  public getStatsHistory(): StatsMetrics[] {
    return this.peer?.getStatsHistory() || []
  }

  public enableStatsMonitoring(): void {
    this.peer?.startStatsMonitoring()
  }

  public disableStatsMonitoring(): void {
    this.peer?.stopStatsMonitoring()
  }
}
```

### Backward Compatibility

The integration maintains backward compatibility by:

1. **Default Enabled**: Stats monitoring is enabled by default but can be disabled
2. **Optional Dependencies**: All monitoring features are optional and fail gracefully
3. **Existing API Preservation**: No changes to existing RTCPeer or BaseConnection APIs
4. **Configuration Options**: New options are added with sensible defaults

```typescript
interface RTCPeerOptions {
  // ... existing options

  // New monitoring options with defaults
  enableStatsMonitoring?: boolean // default: true
  enableAutoRecovery?: boolean // default: true
  statsPollInterval?: number // default: 1000 (desktop), 500 (mobile)
  customThresholds?: Partial<MonitoringThresholds>
}
```

## API Design

### Public Methods

#### WebRTCStatsMonitor Class

```typescript
class WebRTCStatsMonitor {
  // Core lifecycle
  start(peerConnection: RTCPeerConnection): void
  stop(): void

  // Configuration
  configure(options: MonitoringOptions): void
  setThresholds(thresholds: Partial<MonitoringThresholds>): void

  // Data access
  getNetworkQuality(): NetworkQuality
  getMetricsHistory(): StatsMetrics[]
  getActiveIssues(): NetworkIssue[]
  getBaseline(): Baseline | null

  // Recovery control
  enableAutoRecovery(enable: boolean): void
  triggerManualRecovery(type: RecoveryType): Promise<void>

  // Inspection
  isMonitoring(): boolean
  hasAudioTrack(): boolean
  hasVideoTrack(): boolean
}
```

#### Enhanced RTCPeer Methods

```typescript
class RTCPeer {
  // ... existing methods

  // Monitoring control
  startStatsMonitoring(): void
  stopStatsMonitoring(): void
  isStatsMonitoringEnabled(): boolean

  // Data access
  getNetworkQuality(): NetworkQuality | null
  getStatsHistory(): StatsMetrics[]

  // Recovery actions
  requestKeyframe(): Promise<void>
  triggerICERestart(): Promise<void>
}
```

#### Enhanced BaseConnection Methods

```typescript
class BaseConnection {
  // ... existing methods

  // Network quality access
  get networkQuality(): NetworkQuality | null
  getStatsHistory(): StatsMetrics[]

  // Monitoring control
  enableStatsMonitoring(): void
  disableStatsMonitoring(): void

  // Manual recovery
  requestKeyframe(): Promise<void>
  triggerICERestart(): Promise<void>
}
```

### Events

#### Network Quality Events

```typescript
interface NetworkQualityChangedEvent {
  callId: string
  networkQuality: NetworkQuality
  previousQuality?: NetworkQuality
}

interface NetworkQualityWarningEvent {
  callId: string
  issues: NetworkIssue[]
  metrics: StatsMetrics
}

interface NetworkQualityDegradedEvent {
  callId: string
  issues: NetworkIssue[]
  recoveryActions: RecoveryAction[]
}

interface NetworkQualityCriticalEvent {
  callId: string
  issues: NetworkIssue[]
  recoveryActions: RecoveryAction[]
  requiresUserAction?: boolean
}

// Event registration
baseConnection.on('networkQualityChanged', handler)
baseConnection.on('networkQualityWarning', handler)
baseConnection.on('networkQualityDegraded', handler)
baseConnection.on('networkQualityCritical', handler)
```

### Interfaces

#### Core Data Types

```typescript
export enum NetworkIssueType {
  NO_INBOUND_PACKETS = 'no_inbound_packets',
  HIGH_RTT = 'high_rtt',
  HIGH_PACKET_LOSS = 'high_packet_loss',
  HIGH_JITTER = 'high_jitter',
  ICE_DISCONNECTED = 'ice_disconnected',
  DTLS_FAILED = 'dtls_failed',
}

export interface NetworkIssue {
  type: NetworkIssueType
  severity: 'warning' | 'critical'
  timestamp: number
  value?: number
  description?: string
}

export interface NetworkQuality {
  isHealthy: boolean
  lastUpdateTime: number
  activeIssues: NetworkIssue[]
  metrics?: StatsMetrics
  baseline?: Baseline
}

export interface StatsMetrics {
  timestamp: number
  packetsReceived: number
  packetsLost: number
  bytesReceived: number
  roundTripTime: number
  jitter: number
  availableIncomingBitrate?: number
  availableOutgoingBitrate?: number
}

export interface MonitoringThresholds {
  noPacketTimeoutMs: number
  rttSpikeMultiplier: number
  packetLossThreshold: number
  jitterSpikeMultiplier: number
  baselineWindowMs: number
  criticalIssueCount: number
  warningIssueCount: number
}

export interface MonitoringOptions {
  pollInterval?: number
  enableAutoRecovery?: boolean
  thresholds?: Partial<MonitoringThresholds>
  onIssuesDetected?: (issues: NetworkIssue[]) => void
  onRecoveryAttempted?: (type: RecoveryType) => void
}
```

## Performance Considerations

### Resource Management

#### Memory Usage

- **Metrics History**: Limited to 30 entries (30 seconds at 1s intervals)
- **Issue Tracking**: Active issues only, auto-cleanup of resolved issues
- **Baseline Data**: Single baseline object per monitor instance
- **Event Listeners**: Proper cleanup on monitor destruction

```typescript
class WebRTCStatsMonitor {
  private readonly METRICS_HISTORY_SIZE = 30

  private cleanupOldMetrics(): void {
    if (this.metricsHistory.length > this.METRICS_HISTORY_SIZE) {
      this.metricsHistory = this.metricsHistory.slice(
        -this.METRICS_HISTORY_SIZE
      )
    }
  }

  private cleanupResolvedIssues(): void {
    const now = Date.now()
    const staleThreshold = 10000 // 10 seconds

    for (const [type, issue] of this.activeIssues) {
      if (now - issue.timestamp > staleThreshold) {
        this.activeIssues.delete(type)
      }
    }
  }
}
```

#### CPU Usage

- **Adaptive Polling**: Reduces frequency when no issues detected
- **Efficient Stats Parsing**: Minimal object creation during stats processing
- **Selective Monitoring**: Only monitor active audio/video tracks
- **Batched Processing**: Group multiple metrics updates

```typescript
class AdaptivePollingManager {
  private getCurrentInterval(): number {
    const hasActiveIssues = this.activeIssues.size > 0
    const isMobile = this.isMobileDevice()

    if (hasActiveIssues) {
      return isMobile ? 300 : 500 // Faster during issues
    }

    return isMobile ? 1000 : 2000 // Slower when healthy
  }
}
```

### Network Impact

#### Minimal Overhead

- **Native WebRTC APIs**: Uses built-in `getStats()` - no additional network calls
- **Local Processing**: All analysis done locally, no external dependencies
- **Efficient Recovery**: Graduated response avoids unnecessary reinvites

#### Bandwidth Considerations

- **Mobile Optimization**: Reduced polling frequency on mobile devices
- **Recovery Throttling**: Rate limiting prevents recovery storm
- **Selective Actions**: Only perform recovery actions when necessary

### Browser Compatibility

#### Cross-browser Statistics

```typescript
class StatsParser {
  parseInboundRTP(stats: RTCStatsReport): InboundRTPStats | null {
    let inboundRTP: any = null

    stats.forEach((report: any) => {
      // Chrome/Safari format
      if (
        report.type === 'inbound-rtp' &&
        (report.mediaType === 'audio' || report.mediaType === 'video')
      ) {
        inboundRTP = report
      }
      // Firefox format
      else if (
        report.type === 'inbound-rtp' &&
        (report.kind === 'audio' || report.kind === 'video')
      ) {
        inboundRTP = report
      }
    })

    if (!inboundRTP) return null

    return {
      packetsReceived: inboundRTP.packetsReceived || 0,
      packetsLost: inboundRTP.packetsLost || 0,
      bytesReceived: inboundRTP.bytesReceived || 0,
      jitter: inboundRTP.jitter || 0,
      lastPacketReceivedTimestamp: inboundRTP.lastPacketReceivedTimestamp,
    }
  }
}
```

## Testing Strategy

### Unit Tests

#### WebRTCStatsMonitor Tests

```typescript
describe('WebRTCStatsMonitor', () => {
  let monitor: WebRTCStatsMonitor
  let mockPeerConnection: RTCPeerConnection
  let issueCallback: jest.Mock

  beforeEach(() => {
    mockPeerConnection = createMockPeerConnection()
    issueCallback = jest.fn()
    monitor = new WebRTCStatsMonitor({ onIssuesDetected: issueCallback })
  })

  describe('issue detection', () => {
    it('should detect no inbound packets', async () => {
      // Setup: Stats with no recent packets
      const oldTimestamp = Date.now() - 5000
      mockPeerConnection.getStats.mockResolvedValue(
        createMockStats({ lastPacketReceivedTimestamp: oldTimestamp })
      )

      monitor.start(mockPeerConnection)
      await waitFor(() => expect(issueCallback).toHaveBeenCalled())

      const issues = issueCallback.mock.calls[0][0]
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: NetworkIssueType.NO_INBOUND_PACKETS,
          severity: 'critical',
        })
      )
    })

    it('should detect RTT spikes', async () => {
      // Setup baseline
      monitor.start(mockPeerConnection)
      await establishBaseline(monitor, { rtt: 50 })

      // Simulate RTT spike
      mockPeerConnection.getStats.mockResolvedValue(
        createMockStats({ currentRoundTripTime: 200 })
      )

      await waitFor(() => expect(issueCallback).toHaveBeenCalled())

      const issues = issueCallback.mock.calls[0][0]
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: NetworkIssueType.HIGH_RTT,
          severity: 'warning',
        })
      )
    })
  })

  describe('recovery management', () => {
    it('should throttle recovery attempts', () => {
      const recoveryManager = new RecoveryManager()

      // First attempt should be allowed
      expect(recoveryManager.canAttemptRecovery('keyframe')).toBe(true)
      recoveryManager.recordRecoveryAttempt('keyframe')

      // Immediate second attempt should be throttled
      expect(recoveryManager.canAttemptRecovery('keyframe')).toBe(false)
    })
  })
})
```

#### RTCPeer Integration Tests

```typescript
describe('RTCPeer with Stats Monitoring', () => {
  it('should start monitoring when peer connection is established', async () => {
    const call = createMockBaseConnection()
    const peer = new RTCPeer(call, 'offer')

    const startSpy = jest.spyOn(peer['_statsMonitor'], 'start')

    await peer.start()

    expect(startSpy).toHaveBeenCalledWith(peer.instance)
  })

  it('should emit network quality events', async () => {
    const call = createMockBaseConnection()
    const peer = new RTCPeer(call, 'offer')

    const eventSpy = jest.fn()
    call.on('networkQualityChanged', eventSpy)

    await peer.start()

    // Simulate network issue detection
    peer['_handleNetworkIssues']([
      {
        type: NetworkIssueType.HIGH_RTT,
        severity: 'warning',
        timestamp: Date.now(),
      },
    ])

    expect(eventSpy).toHaveBeenCalled()
  })
})
```

### Integration Tests

#### End-to-End Call Scenarios

```typescript
describe('Call with Network Issues', () => {
  it('should recover from packet loss', async () => {
    const { caller, callee } = await setupTestCall()

    // Simulate network degradation
    await simulatePacketLoss(caller, 0.1) // 10% loss

    // Wait for detection and recovery
    await waitFor(() =>
      expect(caller.getNetworkQuality()?.activeIssues).toContainEqual(
        expect.objectContaining({ type: NetworkIssueType.HIGH_PACKET_LOSS })
      )
    )

    // Verify recovery actions
    const keyframeSpy = jest.spyOn(caller, 'requestKeyframe')
    await waitFor(() => expect(keyframeSpy).toHaveBeenCalled())
  })

  it('should trigger ICE restart for critical issues', async () => {
    const { caller, callee } = await setupTestCall()

    // Simulate connection failure
    await simulateConnectionFailure(caller)

    // Verify ICE restart triggered
    const restartSpy = jest.spyOn(caller, 'triggerICERestart')
    await waitFor(() => expect(restartSpy).toHaveBeenCalled())
  })
})
```

### Performance Tests

#### Memory Leak Detection

```typescript
describe('Memory Management', () => {
  it('should not leak memory during long monitoring', async () => {
    const monitor = new WebRTCStatsMonitor()
    const mockPeerConnection = createMockPeerConnection()

    monitor.start(mockPeerConnection)

    // Run for extended period
    for (let i = 0; i < 1000; i++) {
      await simulateStatsUpdate(mockPeerConnection)
      await delay(10)
    }

    const metrics = monitor.getMetricsHistory()
    expect(metrics.length).toBeLessThanOrEqual(30) // History limit

    monitor.stop()

    // Verify cleanup
    expect(monitor.isMonitoring()).toBe(false)
  })
})
```

#### CPU Usage Tests

```typescript
describe('Performance', () => {
  it('should maintain reasonable CPU usage', async () => {
    const monitor = new WebRTCStatsMonitor()
    const mockPeerConnection = createMockPeerConnection()

    const startTime = process.cpuUsage()
    monitor.start(mockPeerConnection)

    // Run monitoring for 30 seconds
    await delay(30000)

    const cpuUsage = process.cpuUsage(startTime)
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000 / 30) * 100

    expect(cpuPercent).toBeLessThan(5) // Less than 5% CPU

    monitor.stop()
  })
})
```

### Manual Testing Scenarios

#### Network Simulation

1. **Packet Loss Simulation**: Use network conditioning tools to introduce packet loss
2. **Latency Spikes**: Simulate high RTT scenarios
3. **Bandwidth Throttling**: Test with limited bandwidth
4. **Connection Drops**: Simulate ICE disconnection events
5. **Mobile Network**: Test on actual mobile devices with varying signal strength

#### Recovery Verification

1. **Keyframe Recovery**: Verify video quality improves after keyframe request
2. **ICE Restart**: Confirm connection recovery after ICE restart
3. **Graduated Response**: Test that warnings don't trigger heavy recovery
4. **Rate Limiting**: Verify recovery throttling prevents storms

## Success Metrics

### Quantitative Metrics

#### Call Quality Improvements

- **Reduced Call Drop Rate**: Target 20% reduction in call failures
- **Faster Recovery Time**: Target recovery within 5 seconds of issue detection
- **Improved Audio/Video Quality**: Measurable reduction in quality complaints
- **Proactive Detection**: 80% of issues detected before user impact

#### Performance Metrics

- **CPU Usage**: Monitor stays under 5% CPU utilization
- **Memory Usage**: Stable memory usage under 10MB per connection
- **Network Overhead**: Zero additional network traffic (uses existing WebRTC APIs)
- **Battery Impact**: Minimal battery drain on mobile devices

#### Reliability Metrics

- **False Positive Rate**: Less than 5% false issue detection
- **Recovery Success Rate**: 90% of recovery attempts succeed
- **Monitoring Uptime**: 99.9% monitoring availability during active calls

### Qualitative Indicators

#### Developer Experience

- **Easy Integration**: Simple API for enabling/disabling monitoring
- **Rich Diagnostics**: Detailed network quality information for debugging
- **Flexible Configuration**: Customizable thresholds and recovery behavior
- **Comprehensive Documentation**: Clear examples and troubleshooting guides

#### User Experience

- **Transparent Operation**: Monitoring runs in background without user awareness
- **Proactive Recovery**: Issues resolved before user notices
- **Predictable Behavior**: Consistent recovery actions across different scenarios
- **Quality Awareness**: Users informed of network quality when appropriate

### Monitoring and Observability

#### Application-Level Metrics

```typescript
// Example integration with application metrics
class ApplicationMetrics {
  recordNetworkQualityChange(event: NetworkQualityChangedEvent): void {
    this.histogram(
      'webrtc.network_quality.score',
      event.networkQuality.isHealthy ? 1 : 0
    )

    this.counter(
      'webrtc.issues.total',
      event.networkQuality.activeIssues.length,
      { call_id: event.callId }
    )
  }

  recordRecoveryAttempt(type: RecoveryType, success: boolean): void {
    this.counter('webrtc.recovery.attempts', 1, {
      type,
      success: success.toString(),
    })
  }
}
```

#### Dashboard Integration

- **Real-time Quality Monitoring**: Live view of network quality across active calls
- **Issue Trend Analysis**: Historical view of common network issues
- **Recovery Effectiveness**: Success rates of different recovery actions
- **Performance Impact**: Resource usage and overhead monitoring

### Success Criteria

The WebRTC Stats Monitoring feature will be considered successful when:

1. **Quality Improvement**: 20% reduction in user-reported call quality issues
2. **Proactive Detection**: 80% of network issues detected before user impact
3. **Fast Recovery**: Average recovery time under 5 seconds
4. **Minimal Overhead**: CPU usage under 5%, memory usage under 10MB
5. **High Reliability**: 99.9% monitoring uptime, <5% false positives
6. **Developer Adoption**: Easy integration with clear documentation
7. **Production Stability**: No regressions in existing call functionality

The feature should seamlessly integrate into the existing @signalwire/webrtc package, providing immediate value for call quality while maintaining the performance and reliability standards of the SignalWire SDK.
