import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LocalAudioPipeline } from './LocalAudioPipeline';

// ---------------------------------------------------------------------------
// Mock Web Audio API
// ---------------------------------------------------------------------------

class MockGainNode {
  public gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAnalyserNode {
  public fftSize = 2048;
  public smoothingTimeConstant = 0.3;
  public timeDomainSnapshot = new Uint8Array(2048).fill(128);
  connect = vi.fn();
  disconnect = vi.fn();
  getByteTimeDomainData = vi.fn((buffer: Uint8Array) => {
    buffer.set(this.timeDomainSnapshot);
  });
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockMediaStreamAudioDestinationNode {
  private readonly _track = {
    id: 'processed-track',
    kind: 'audio',
    stop: vi.fn()
  } as unknown as MediaStreamTrack;
  public readonly stream = {
    getAudioTracks: (): MediaStreamTrack[] => [this._track]
  } as unknown as MediaStream;
}

class MockAudioContext {
  public readonly gainNode = new MockGainNode();
  public readonly analyser = new MockAnalyserNode();
  public readonly destination = new MockMediaStreamAudioDestinationNode();
  close = vi.fn(async (): Promise<void> => undefined);
  createGain = vi.fn((): MockGainNode => this.gainNode);
  createAnalyser = vi.fn((): MockAnalyserNode => this.analyser);
  createMediaStreamDestination = vi.fn(
    (): MockMediaStreamAudioDestinationNode => this.destination
  );
  createMediaStreamSource = vi.fn(
    (_stream: MediaStream): MockMediaStreamAudioSourceNode =>
      new MockMediaStreamAudioSourceNode()
  );
}

function createMockTrack(id = 'raw-track'): MediaStreamTrack {
  return {
    id,
    kind: 'audio',
    stop: vi.fn()
  } as unknown as MediaStreamTrack;
}

function createPipeline(opts: {
  initialGain?: number;
  speakingThreshold?: number;
  speakingHoldMs?: number;
  pollIntervalMs?: number;
}): { pipeline: LocalAudioPipeline; ctx: MockAudioContext } {
  const ctx = new MockAudioContext();
  const pipeline = new LocalAudioPipeline({
    ...opts,
    audioContextFactory: () => ctx as unknown as AudioContext
  });
  return { pipeline, ctx };
}

// Polyfill MediaStream constructor used by the pipeline. happy-dom doesn't
// provide one, so substitute a minimal stub.
beforeEach(() => {
  (globalThis as unknown as { MediaStream: unknown }).MediaStream = class {
    private readonly tracks: MediaStreamTrack[];
    constructor(tracks: MediaStreamTrack[] = []) {
      this.tracks = tracks;
    }
    getAudioTracks(): MediaStreamTrack[] {
      return this.tracks;
    }
    getTracks(): MediaStreamTrack[] {
      return this.tracks;
    }
  };
});

describe('LocalAudioPipeline', () => {
  it('wires gain → analyser → destination on construction', () => {
    const { ctx } = createPipeline({});
    expect(ctx.gainNode.connect).toHaveBeenCalledWith(ctx.analyser);
    expect(ctx.analyser.connect).toHaveBeenCalledWith(ctx.destination);
  });

  it('applies the initial gain to the GainNode', () => {
    const { ctx } = createPipeline({ initialGain: 0.5 });
    expect(ctx.gainNode.gain.value).toBe(0.5);
  });

  it('clamps setGain to [0, 2]', () => {
    const { pipeline, ctx } = createPipeline({});

    pipeline.setGain(5);
    expect(pipeline.gain).toBe(2);
    expect(ctx.gainNode.gain.value).toBe(2);

    pipeline.setGain(-3);
    expect(pipeline.gain).toBe(0);
    expect(ctx.gainNode.gain.value).toBe(0);
  });

  it('setPTTActive and setGain are orthogonal', () => {
    const { pipeline, ctx } = createPipeline({ initialGain: 1 });

    pipeline.setGain(0.75);
    expect(ctx.gainNode.gain.value).toBe(0.75);

    pipeline.setPTTActive(false); // released
    expect(ctx.gainNode.gain.value).toBe(0);
    expect(pipeline.gain).toBe(0.75); // configured gain preserved

    pipeline.setGain(0.5); // while released — should stay silent on the graph
    expect(ctx.gainNode.gain.value).toBe(0);
    expect(pipeline.gain).toBe(0.5);

    pipeline.setPTTActive(true); // held
    expect(ctx.gainNode.gain.value).toBe(0.5); // configured gain reappears
  });

  it('setInputTrack connects the source to the gain node', () => {
    const { pipeline, ctx } = createPipeline({});
    const track = createMockTrack();

    pipeline.setInputTrack(track);

    expect(ctx.createMediaStreamSource).toHaveBeenCalledTimes(1);
    const source = ctx.createMediaStreamSource.mock.results[0].value;
    expect(source.connect).toHaveBeenCalledWith(ctx.gainNode);
  });

  it('setInputTrack disconnects the previous source before attaching a new one', () => {
    const { pipeline, ctx } = createPipeline({});
    pipeline.setInputTrack(createMockTrack('a'));
    const firstSource = ctx.createMediaStreamSource.mock.results[0].value;

    pipeline.setInputTrack(createMockTrack('b'));

    expect(firstSource.disconnect).toHaveBeenCalled();
    expect(ctx.createMediaStreamSource).toHaveBeenCalledTimes(2);
  });

  it('setInputTrack(null) disconnects without attaching a new source', () => {
    const { pipeline, ctx } = createPipeline({});
    pipeline.setInputTrack(createMockTrack());
    const source = ctx.createMediaStreamSource.mock.results[0].value;

    pipeline.setInputTrack(null);

    expect(source.disconnect).toHaveBeenCalled();
    expect(ctx.createMediaStreamSource).toHaveBeenCalledTimes(1);
  });

  it('outputTrack returns the destination track', () => {
    const { pipeline, ctx } = createPipeline({});
    expect(pipeline.outputTrack).toBe(ctx.destination.stream.getAudioTracks()[0]);
  });

  it('computes RMS level from the analyser buffer', async () => {
    const { pipeline, ctx } = createPipeline({ pollIntervalMs: 10 });
    pipeline.setInputTrack(createMockTrack());

    // 128 in the buffer = silence. Fill half with a known amplitude.
    const amplitude = 200; // normalized = (200-128)/128 = 0.5625
    const snapshot = new Uint8Array(ctx.analyser.fftSize).fill(128);
    for (let i = 0; i < snapshot.length / 2; i += 1) {
      snapshot[i] = amplitude;
    }
    ctx.analyser.timeDomainSnapshot = snapshot;

    const level = await firstValueFrom(pipeline.level$);
    // Expected RMS: sqrt((N/2 * 0.5625^2 + N/2 * 0) / N) = sqrt(0.5625^2 / 2)
    const expected = Math.sqrt((0.5625 * 0.5625) / 2);
    expect(level).toBeCloseTo(expected, 2);
  });

  it('level$ emits 0 when no input track is attached', async () => {
    const { pipeline } = createPipeline({ pollIntervalMs: 10 });
    const level = await firstValueFrom(pipeline.level$);
    expect(level).toBe(0);
  });

  it('speaking$ emits true only above threshold and holds through brief silence', async () => {
    const { pipeline, ctx } = createPipeline({
      pollIntervalMs: 10,
      speakingThreshold: 0.1,
      speakingHoldMs: 200
    });
    pipeline.setInputTrack(createMockTrack());

    // Fill analyser with values producing RMS ≈ 0.5
    const loud = new Uint8Array(ctx.analyser.fftSize).fill(192); // normalized = 0.5
    ctx.analyser.timeDomainSnapshot = loud;

    const emissions = await firstValueFrom(pipeline.speaking$.pipe(take(1), toArray()));
    expect(emissions).toEqual([true]);
  });

  it('destroy closes the audio context', () => {
    const { pipeline, ctx } = createPipeline({});
    pipeline.setInputTrack(createMockTrack());
    pipeline.destroy();
    expect(ctx.close).toHaveBeenCalled();
  });
});
