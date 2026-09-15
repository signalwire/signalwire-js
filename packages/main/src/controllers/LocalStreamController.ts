import { takeUntil } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { MediaOptions, TrackOrigin } from '../core/types/media.types';
import type { Observable } from 'rxjs';

const logger = getLogger();

export interface LocalStreamControllerOptions extends Omit<
  MediaOptions,
  'inputAudioDeviceConstraints' | 'inputVideoDeviceConstraints'
> {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia: (options: DisplayMediaStreamOptions) => Promise<MediaStream>;
  propose: 'main' | 'screenshare' | 'additional-device';
  inputAudioDeviceConstraints?: MediaTrackConstraints | boolean;
  inputVideoDeviceConstraints?: MediaTrackConstraints | boolean;
  screenShareAudio?: boolean;
}

export class LocalStreamController extends Destroyable {
  private mediaTrackEndedHandler = (event: unknown) => {
    this._mediaTrackEnded$.next(event as MediaStreamTrack);
  };
  private _localStream$ = this.createBehaviorSubject<MediaStream | null>(null);
  private _localAudioTracks$ = this.createBehaviorSubject<MediaStreamTrack[]>([]);
  private _localVideoTracks$ = this.createBehaviorSubject<MediaStreamTrack[]>([]);
  private _mediaTrackEnded$ = this.createSubject<MediaStreamTrack>();
  /** A lookup, not a subject — nothing observes provenance. */
  private _trackOrigins = new WeakMap<MediaStreamTrack, TrackOrigin>();

  constructor(private options: LocalStreamControllerOptions) {
    super();
  }

  public get localStream$(): Observable<MediaStream | null> {
    return this._localStream$.asObservable().pipe(takeUntil(this.destroyed$));
  }

  public get localAudioTracks$(): Observable<MediaStreamTrack[]> {
    return this._localAudioTracks$.asObservable().pipe(takeUntil(this.destroyed$));
  }

  public get localVideoTracks$(): Observable<MediaStreamTrack[]> {
    return this._localVideoTracks$.asObservable().pipe(takeUntil(this.destroyed$));
  }

  public get mediaTrackEnded$(): Observable<MediaStreamTrack> {
    return this._mediaTrackEnded$.asObservable().pipe(takeUntil(this.destroyed$));
  }

  public get localStream(): MediaStream | null {
    return this._localStream$.value;
  }

  public get localAudioTracks(): MediaStreamTrack[] {
    return this._localAudioTracks$.value;
  }

  public get localVideoTracks(): MediaStreamTrack[] {
    return this._localVideoTracks$.value;
  }

  private tagTracks(tracks: MediaStreamTrack[], origin: TrackOrigin): void {
    for (const track of tracks) {
      this._trackOrigins.set(track, origin);
    }
  }

  public setTrackOrigin(track: MediaStreamTrack, origin: TrackOrigin): void {
    this._trackOrigins.set(track, origin);
  }

  public getTrackOrigin(track: MediaStreamTrack): TrackOrigin | undefined {
    return this._trackOrigins.get(track);
  }

  /**
   * Fail-safe: an unrecorded track reads as not-a-device-capture, so a missed
   * tagging site leaves media alone rather than destroying it.
   */
  public isDeviceCapture(track: MediaStreamTrack): boolean {
    return this._trackOrigins.get(track) === 'device';
  }

  /**
   * Build the local media stream based on the provided options.
   */
  public async buildLocalStream(): Promise<MediaStream> {
    logger.debug('[LocalStreamController] Building local media stream.');
    let stream: MediaStream;
    if (this.options.inputAudioStream ?? this.options.inputVideoStream) {
      const tracks = [
        ...(this.options.inputAudioStream?.getTracks() ?? []),
        ...(this.options.inputVideoStream?.getTracks() ?? [])
      ];
      stream = new MediaStream(tracks);
      this.tagTracks(tracks, 'application');
    } else if (this.options.propose === 'screenshare') {
      const audio = this.options.screenShareAudio ?? false;
      logger.debug(
        '[LocalStreamController] Requesting display media for screen sharing with audio:',
        audio
      );
      stream = await this.options.getDisplayMedia({
        video: true,
        audio
      });
      logger.debug('[LocalStreamController] Screen share media obtained:', stream);
      this.tagTracks(stream.getTracks(), 'display');
    } else {
      const constraints: MediaStreamConstraints = {
        audio: this.options.inputAudioDeviceConstraints,
        video: this.options.inputVideoDeviceConstraints
      };
      logger.debug('[LocalStreamController] Requesting user media with constraints:', constraints);
      stream = await this.options.getUserMedia(constraints);
      logger.debug('[LocalStreamController] User media obtained:', stream);
      this.tagTracks(stream.getTracks(), 'device');
    }
    this._localStream$.next(stream);
    // Emit the kind-specific track lists so observers (and synchronous
    // readers of localAudioTracks / localVideoTracks) see the freshly-built
    // stream's tracks. Without this, the subjects stay [] until a later
    // addTrack() call — leaving any code that depends on the synchronous
    // getter (e.g. LocalAudioPipeline track hookup) running against empty
    // arrays right after call setup.
    this._localAudioTracks$.next(stream.getAudioTracks());
    this._localVideoTracks$.next(stream.getVideoTracks());
    return stream;
  }

  /**
   * Add a local media track to the local stream.
   * @param track - The MediaStreamTrack to add
   * @param origin - Defaults to `'device'`; every internal caller passes a
   * fresh `getUserMedia` capture.
   * @returns The MediaStream (either existing or newly created)
   */
  public addTrack(track: MediaStreamTrack, origin: TrackOrigin = 'device'): MediaStream {
    const localStream = this._localStream$.value ?? new MediaStream();

    this._trackOrigins.set(track, origin);
    track.addEventListener('ended', this.mediaTrackEndedHandler);
    localStream.addTrack(track);
    this._localStream$.next(localStream);

    if (track.kind === 'video') {
      this._localVideoTracks$.next(localStream.getVideoTracks());
    } else {
      this._localAudioTracks$.next(localStream.getAudioTracks());
    }

    logger.debug(`[LocalStreamController] ${track.kind} track added:`, track.id);
    return localStream;
  }

  /**
   * Remove a local media track from the local stream.
   * @param trackId - The ID of the track to remove
   * @returns The removed track, or undefined if not found
   */
  public removeTrack(trackId: string): MediaStreamTrack | undefined {
    const stream = this._localStream$.value;
    const track = stream?.getTracks().find((t: MediaStreamTrack) => t.id === trackId);

    if (!track) {
      logger.debug(`[LocalStreamController] track not found: ${trackId}`);
      return undefined;
    }

    track.removeEventListener('ended', this.mediaTrackEndedHandler);
    stream?.removeTrack(track);
    track.stop();
    this._localStream$.next(stream);

    if (track.kind === 'video') {
      this._localVideoTracks$.next(stream?.getVideoTracks() ?? []);
    } else {
      this._localAudioTracks$.next(stream?.getAudioTracks() ?? []);
    }

    logger.debug(`[LocalStreamController] ${track.kind} track removed:`, trackId);
    return track;
  }

  /**
   * Get or create a local stream.
   */
  public getOrCreateLocalStream(): MediaStream {
    return this._localStream$.value ?? new MediaStream();
  }

  /**
   * Set the local stream directly.
   */
  public setLocalStream(stream: MediaStream | null): void {
    this._localStream$.next(stream);
  }

  /**
   * Add a track ended event listener to a track.
   */
  public addTrackEndedListener(track: MediaStreamTrack): void {
    track.addEventListener('ended', this.mediaTrackEndedHandler);
  }

  /**
   * Update the controller options (e.g., when media overrides are applied).
   */
  public updateOptions(options: Partial<LocalStreamControllerOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * Stop all local tracks and clean up.
   */
  public stopAllTracks(): void {
    const localStream = this._localStream$.value;
    localStream?.getTracks().forEach((track: MediaStreamTrack) => {
      logger.debug(`[LocalStreamController] Stopping local track: ${track.kind}`);
      track.removeEventListener('ended', this.mediaTrackEndedHandler);
      track.stop();
    });
  }

  /**
   * Clean up resources.
   */
  public override destroy(): void {
    this.stopAllTracks();
    super.destroy();
  }
}
