import { test, expect, Page } from '@playwright/test';

/**
 * Google's public STUN server for testing
 */
const GOOGLE_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: 'stun:stun.l.google.com:19302',
  },
];

/**
 * Helper class to manage RTCPeerConnectionController instances in the browser context
 */
class PeerConnectionControllerHelper {
  constructor(
    private page: Page,
    private peerId: string
  ) {}

  /**
   * Initialize RTCPeerConnectionController in the browser context
   */
  async initialize(options: {
    audio?: boolean;
    video?: boolean;
    remoteOffer?: string;
  }): Promise<void> {
    await this.page.evaluate(
      async ({ peerId, iceServers, audio, video, remoteOffer }) => {
        // Import the controller from the bundled distribution
        const { RTCPeerConnectionController } = await import(
          '/dist/browser.mjs'
        );

        // Just pass the media constraints and let the controller handle device selection

        // Create controller configuration
        const controllerOptions: any = {
          iceServers,
          propose: 'main',
          receiveAudio: true,
          receiveVideo: true,
          inputAudioDeviceConstraints: { audio },
          inputVideoDeviceConstraints: { video },
        };

        // Create the controller (with remoteOffer if this is the answerer)
        const controller = new RTCPeerConnectionController(
          controllerOptions,
          remoteOffer
        );

        // Store in window for access
        (window as any)[`peer_${peerId}`] = {
          controller,
        };
      },
      {
        peerId: this.peerId,
        iceServers: GOOGLE_ICE_SERVERS,
        audio: options.audio ?? false,
        video: options.video ?? false,
        remoteOffer: options.remoteOffer,
      }
    );
  }

  /**
   * Wait for local stream to be ready
   */
  async waitForLocalStream(timeout = 10000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const hasStream = await this.page.evaluate(
        ({ peerId }) => {
          const peer = (window as any)[`peer_${peerId}`];
          return peer?.controller.localStream$.value !== null;
        },
        { peerId: this.peerId }
      );

      if (hasStream) {
        return;
      }

      await this.page.waitForTimeout(100);
    }
    throw new Error(
      `Local stream not ready within ${timeout}ms for ${this.peerId}`
    );
  }

  /**
   * Wait for local description to be ready
   */
  async waitForLocalDescription(
    timeout = 15000
  ): Promise<RTCSessionDescriptionInit> {
    return (await this.page.evaluate(
      async ({ peerId }) => {
        const peer = (window as any)[`peer_${peerId}`];

        // Create a simple firstValueFrom implementation
        const firstValueFrom = (obs: any): Promise<any> => {
          return new Promise((resolve, reject) => {
            const sub = obs.subscribe({
              next: (value: any) => {
                sub.unsubscribe();
                resolve(value);
              },
              error: reject,
            });
          });
        };

        const desc = await firstValueFrom(peer.controller.localDescription$);

        if (!desc || !desc.sdp) {
          throw new Error(`Local description not ready for ${peerId}`);
        }

        return desc;
      },
      { peerId: this.peerId }
    )) as Promise<RTCSessionDescriptionInit>;
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    await this.page.evaluate(
      async ({ peerId, description }) => {
        const peer = (window as any)[`peer_${peerId}`];
        const controller = peer.controller;

        if (description.type === 'answer') {
          // Use updateAnswerStatus for answer
          await controller.updateAnswerStatus({
            status: 'received',
            sdp: description.sdp,
          });
        } else {
          // For offer, set remote description directly
          await controller._setRemoteDescription(description);
        }

        peer.remoteDescription = description;
      },
      { peerId: this.peerId, description }
    );
  }

  /**
   * Get connection state
   */
  async getConnectionState(): Promise<RTCPeerConnectionState> {
    return await this.page.evaluate(
      async ({ peerId }) => {
        const peer = (window as any)[`peer_${peerId}`];

        //  Access the internal peer connection state directly
        return peer.controller.peerConnection?.connectionState || 'new';
      },
      { peerId: this.peerId }
    );
  }

  /**
   * Get ICE connection state
   */
  async getIceConnectionState(): Promise<RTCIceConnectionState> {
    return await this.page.evaluate(
      async ({ peerId }) => {
        const peer = (window as any)[`peer_${peerId}`];

        // Access the internal peer connection state directly
        return peer.controller.peerConnection?.iceConnectionState || 'new';
      },
      { peerId: this.peerId }
    );
  }

  /**
   * Wait for connection to be established
   */
  async waitForConnection(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const connectionState = await this.getConnectionState();
      const iceConnectionState = await this.getIceConnectionState();

      console.log(
        `[${this.peerId}] Waiting for connection - State: ${connectionState}, ICE: ${iceConnectionState}`
      );

      if (
        connectionState === 'connected' &&
        (iceConnectionState === 'connected' ||
          iceConnectionState === 'completed')
      ) {
        return;
      }

      if (connectionState === 'failed' || iceConnectionState === 'failed') {
        throw new Error(`Connection failed for ${this.peerId}`);
      }

      await this.page.waitForTimeout(500);
    }
    throw new Error(
      `Connection did not establish within timeout for ${this.peerId}`
    );
  }

  /**
   * Get local and remote stream track counts
   */
  async getStreamInfo(): Promise<{
    local: { audio: number; video: number };
    remote: { audio: number; video: number };
  }> {
    return await this.page.evaluate(
      ({ peerId }) => {
        const peer = (window as any)[`peer_${peerId}`];
        const localStream = peer?.controller.localStream$
          .value as MediaStream | null;
        const remoteStream = peer?.controller.remoteStream$
          .value as MediaStream | null;

        return {
          local: {
            audio: localStream?.getAudioTracks().length ?? 0,
            video: localStream?.getVideoTracks().length ?? 0,
          },
          remote: {
            audio: remoteStream?.getAudioTracks().length ?? 0,
            video: remoteStream?.getVideoTracks().length ?? 0,
          },
        };
      },
      { peerId: this.peerId }
    );
  }

  /**
   * Clean up
   */
  async cleanup(): Promise<void> {
    await this.page.evaluate(
      ({ peerId }) => {
        const peer = (window as any)[`peer_${peerId}`];
        if (peer) {
          // Unsubscribe from all observables
          peer.subscriptions.forEach((sub: any) => sub.unsubscribe());

          // Destroy the controller
          peer.controller.destroy();

          delete (window as any)[`peer_${peerId}`];
        }
      },
      { peerId: this.peerId }
    );
  }
}

test.describe('RTCPeerConnectionController Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`Browser Console [${msg.type()}]: ${msg.text()}`);
    });
    // Navigate to the test page served via HTTP (localhost is a secure context)
    await page.goto('http://localhost:8765');

    // Grant permissions for media devices
    await page.context().grantPermissions(['microphone', 'camera']);
  });

  test('should establish peer-to-peer connection with audio and video', async ({
    page,
  }) => {
    const peer1 = new PeerConnectionControllerHelper(page, 'peer1');
    const peer2 = new PeerConnectionControllerHelper(page, 'peer2');

    try {
      // Step 1: Initialize Peer 1 (Offerer) and wait for its offer
      console.log('=== Step 1: Initializing Peer 1 (Offerer) ===');
      await peer1.initialize({ audio: true, video: true });

      console.log('=== Waiting for Peer 1 Offer ===');
      const offer = await peer1.waitForLocalDescription();
      expect(offer.type).toBe('offer');
      expect(offer.sdp).toBeDefined();
      console.log('✓ Peer 1 offer ready:', offer.sdp);

      // Step 2: Initialize Peer 2 (Answerer) with Peer 1's offer
      console.log(
        '\n=== Step 2: Initializing Peer 2 (Answerer) with Offer ==='
      );
      await peer2.initialize({
        audio: true,
        video: true,
        remoteOffer: offer.sdp,
      });

      console.log('=== Waiting for Peer 2 Answer ===');
      const answer = await peer2.waitForLocalDescription();
      expect(answer.type).toBe('answer');
      expect(answer.sdp).toBeDefined();
      console.log('✓ Peer 2 answer ready:', answer.sdp);

      // Step 3: Update Peer 1 with Peer 2's answer using updateAnswerStatus
      console.log('\n=== Step 3: Updating Peer 1 with Answer ===');
      await peer1.setRemoteDescription(answer);

      // Wait for connections to establish
      console.log('=== Waiting for Connections to Establish ===');
      await Promise.all([peer1.waitForConnection(), peer2.waitForConnection()]);

      // Verify connection states
      const peer1State = await peer1.getConnectionState();
      const peer2State = await peer2.getConnectionState();
      const peer1IceState = await peer1.getIceConnectionState();
      const peer2IceState = await peer2.getIceConnectionState();

      console.log(`Peer1 - Connection: ${peer1State}, ICE: ${peer1IceState}`);
      console.log(`Peer2 - Connection: ${peer2State}, ICE: ${peer2IceState}`);

      expect(peer1State).toBe('connected');
      expect(peer2State).toBe('connected');
      expect(['connected', 'completed']).toContain(peer1IceState);
      expect(['connected', 'completed']).toContain(peer2IceState);
    } finally {
      // await peer1.cleanup();
      // await peer2.cleanup();
    }
  });
});
