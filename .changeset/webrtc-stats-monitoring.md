---
'@signalwire/webrtc': minor
'@signalwire/client': minor
---

Add WebRTC Stats Monitoring feature with real-time network quality detection and automatic recovery

This release introduces a comprehensive WebRTC Stats Monitoring system that provides real-time monitoring of connection health and implements automatic recovery mechanisms to maintain call quality.

**Key Features:**

- **Real-time Network Quality Detection**: Continuously monitors RTCStats to detect network degradation, packet loss, and connection quality issues
- **Three-tier Recovery System**: Implements progressive recovery strategies:
  - Tier 1: ICE restart for minor connectivity issues
  - Tier 2: Renegotiation for media stream problems  
  - Tier 3: Full reconnection for severe connection failures
- **Baseline Establishment**: Automatically establishes performance baselines during the first 30 seconds of each call
- **Configurable Thresholds**: Allows customization of monitoring intervals, detection thresholds, and recovery triggers

**Integration:**

- Enhanced `RTCPeer` class with built-in stats monitoring capabilities
- Updated `BaseConnection` class to leverage monitoring data for connection management
- New public APIs for enabling/disabling monitoring and accessing real-time stats data
- Automatic integration with existing call flows while maintaining full backward compatibility

**Public API Additions:**

- `enableStatsMonitoring()` - Enable real-time monitoring
- `disableStatsMonitoring()` - Disable monitoring
- `getNetworkQuality()` - Get current network quality metrics
- `getConnectionStats()` - Access detailed connection statistics
- New events: `network.quality.changed`, `connection.recovery.started`, `connection.recovery.completed`

**Backward Compatibility:**

All existing APIs remain unchanged. The monitoring system is opt-in and does not affect existing implementations unless explicitly enabled.