import { filter, firstValueFrom, take, timeout } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { PreflightError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { Call } from '../core/entities/types/call.types';
import type { PreflightOptions, PreflightResult } from '../core/types/resilience.types';
import type { DeviceController } from '../interfaces/DeviceController';

const logger = getLogger();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MEDIA_TEST_DURATION_S = 10;
const ICE_GATHERING_TIMEOUT_MS = 10_000;
const SIGNALING_RTT_TIMEOUT_MS = 5_000;
const DEVICE_TEST_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DialFn = (destination: string, options?: Record<string, unknown>) => Promise<Call>;

interface IceTestResult {
  type: 'direct' | 'relay' | 'failed';
  turnReachable: boolean;
  stunReachable: boolean;
  rttMs: number;
}

// ---------------------------------------------------------------------------
// PreflightRunner
// ---------------------------------------------------------------------------

/**
 * Runs a multi-phase connectivity test:
 *   1. Signaling -- verify WebSocket is connected, measure RTT
 *   2. Devices -- verify getUserMedia works with selected devices
 *   3. ICE/TURN -- gather ICE candidates and check reachability
 *   4. Media/bandwidth -- dial, collect getStats(), compute bandwidth
 *
 * Extends Destroyable so all resources are cleaned up when done.
 */
export class PreflightRunner extends Destroyable {
  private readonly _options: Required<Pick<PreflightOptions, 'duration' | 'skipMediaTest'>> &
    PreflightOptions;

  constructor(
    private readonly deviceController: DeviceController,
    private readonly iceServers: RTCIceServer[],
    private readonly isConnected: boolean,
    private readonly transportRttMs: number,
    private readonly dialFn: DialFn,
    options: PreflightOptions = {}
  ) {
    super();
    this._options = {
      duration: options.duration ?? DEFAULT_MEDIA_TEST_DURATION_S,
      skipMediaTest: options.skipMediaTest ?? false,
      audioDevice: options.audioDevice,
      videoDevice: options.videoDevice
    };
  }

  /**
   * Execute the full preflight test and return the result.
   * Always cleans up resources on completion or error.
   */
  public async run(destination: string): Promise<PreflightResult> {
    const warnings: string[] = [];

    try {
      // Phase 1: Signaling test
      const signaling = this.testSignaling();
      if (!signaling.reachable) {
        warnings.push('WebSocket not connected');
      }

      // Phase 2: Device test
      const devices = await this.testDevices();
      if (!devices.audioInput.working) {
        warnings.push('Audio input device not working');
      }
      if (!devices.videoInput.working) {
        warnings.push('Video input device not working');
      }

      // Phase 3: ICE/TURN test
      const connectivity = await this.testIceConnectivity();
      if (connectivity.type === 'failed') {
        warnings.push('No ICE connectivity (neither STUN nor TURN reachable)');
      } else if (connectivity.type === 'relay') {
        warnings.push('Only TURN relay connectivity available (no direct path)');
      }
      if (!connectivity.turnReachable) {
        warnings.push('TURN servers not reachable');
      }

      // Phase 4: Media/bandwidth test (optional)
      let bandwidth: PreflightResult['bandwidth'] = null;
      if (!this._options.skipMediaTest) {
        try {
          bandwidth = await this.testMediaBandwidth(destination);
        } catch (error) {
          logger.warn('[PreflightRunner] Media bandwidth test failed:', error);
          warnings.push('Media bandwidth test failed');
        }
      }

      const ok =
        signaling.reachable && connectivity.type !== 'failed' && devices.audioInput.working;

      return {
        ok,
        signaling,
        connectivity,
        bandwidth,
        devices,
        warnings
      };
    } catch (error) {
      logger.error('[PreflightRunner] Preflight test failed:', error);
      throw new PreflightError(
        'preflight',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.destroy();
    }
  }

  // -------------------------------------------------------------------------
  // Phase 1: Signaling test
  // -------------------------------------------------------------------------

  private testSignaling(): PreflightResult['signaling'] {
    return {
      reachable: this.isConnected,
      rttMs: this.transportRttMs
    };
  }

  // -------------------------------------------------------------------------
  // Phase 2: Device test
  // -------------------------------------------------------------------------

  private async testDevices(): Promise<PreflightResult['devices']> {
    const audioDevice = this._options.audioDevice ?? this.deviceController.selectedAudioInputDevice;
    const videoDevice = this._options.videoDevice ?? this.deviceController.selectedVideoInputDevice;
    const audioOutputDevice = this.deviceController.selectedAudioOutputDevice;

    let audioWorking = false;
    let videoWorking = false;
    let audioStream: MediaStream | undefined;

    try {
      const constraints: MediaStreamConstraints = {};
      if (audioDevice) {
        constraints.audio = { deviceId: { exact: audioDevice.deviceId } };
      } else {
        constraints.audio = true;
      }
      if (videoDevice) {
        constraints.video = { deviceId: { exact: videoDevice.deviceId } };
      } else {
        constraints.video = true;
      }

      audioStream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<MediaStream>((_, reject) =>
          setTimeout(() => reject(new Error('getUserMedia timeout')), DEVICE_TEST_TIMEOUT_MS)
        )
      ]);

      for (const track of audioStream.getTracks()) {
        if (track.kind === 'audio' && track.readyState === 'live') {
          audioWorking = true;
        }
        if (track.kind === 'video' && track.readyState === 'live') {
          videoWorking = true;
        }
      }
    } catch (error) {
      logger.warn('[PreflightRunner] Device test failed:', error);
    } finally {
      // Release tracks
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
    }

    return {
      audioInput: { working: audioWorking, device: audioDevice },
      videoInput: { working: videoWorking, device: videoDevice },
      audioOutput: { available: !!audioOutputDevice, device: audioOutputDevice }
    };
  }

  // -------------------------------------------------------------------------
  // Phase 3: ICE/TURN connectivity test
  // -------------------------------------------------------------------------

  private async testIceConnectivity(): Promise<IceTestResult> {
    let pc: RTCPeerConnection | undefined;
    try {
      pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const peerConnection = pc;

      const candidateTypes = new Set<string>();
      const startTime = Date.now();

      const gatheringComplete = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ICE_GATHERING_TIMEOUT_MS);

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            const candidateStr = event.candidate.candidate;
            if (candidateStr.includes('typ host')) candidateTypes.add('host');
            if (candidateStr.includes('typ srflx')) candidateTypes.add('srflx');
            if (candidateStr.includes('typ relay')) candidateTypes.add('relay');
          } else {
            clearTimeout(timer);
            resolve();
          }
        };
      });

      // Create a dummy data channel to trigger ICE gathering
      pc.createDataChannel('preflight-test');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await gatheringComplete;
      const rttMs = Date.now() - startTime;

      const stunReachable = candidateTypes.has('srflx');
      const turnReachable = candidateTypes.has('relay');
      const hasHost = candidateTypes.has('host');

      let type: IceTestResult['type'] = 'failed';
      if (hasHost || stunReachable) {
        type = 'direct';
      } else if (turnReachable) {
        type = 'relay';
      }

      return { type, turnReachable, stunReachable, rttMs };
    } catch (error) {
      logger.warn('[PreflightRunner] ICE connectivity test failed:', error);
      return { type: 'failed', turnReachable: false, stunReachable: false, rttMs: 0 };
    } finally {
      if (pc) {
        pc.close();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase 4: Media/bandwidth test
  // -------------------------------------------------------------------------

  private async testMediaBandwidth(
    destination: string
  ): Promise<{ uploadKbps: number; downloadKbps: number }> {
    let call: Call | undefined;
    try {
      call = await this.dialFn(destination, {
        audio: true,
        video: false
      });

      // Wait for call to connect
      await firstValueFrom(
        call.status$.pipe(
          filter((s) => s === 'connected'),
          take(1),
          timeout(SIGNALING_RTT_TIMEOUT_MS)
        )
      );

      // Collect stats for the test duration
      const durationMs = this._options.duration * 1000;
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      // Read final metrics
      const metrics = call.networkMetrics;
      let uploadKbps = 0;
      let downloadKbps = 0;

      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        if (latest.availableOutgoingBitrate !== undefined) {
          uploadKbps = Math.round(latest.availableOutgoingBitrate / 1000);
        }
        // Estimate download from total packets received (rough approximation)
        const totalPackets = latest.audio.packetsReceived + latest.video.packetsReceived;
        if (durationMs > 0 && totalPackets > 0) {
          // Use upload as rough proxy for download when per-track bytes unavailable
          downloadKbps = uploadKbps;
        }
      }

      return { uploadKbps, downloadKbps };
    } finally {
      // Always hang up the test call
      if (call) {
        try {
          await call.hangup();
        } catch {
          // Best-effort cleanup
        }
      }
    }
  }

  public override destroy(): void {
    super.destroy();
  }
}
