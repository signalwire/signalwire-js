import { distinctUntilChanged, map } from 'rxjs/operators';

import { Destroyable } from '../../behaviors/Destroyable';
import { PreferencesContainer } from '../../containers/PreferencesContainer';
import { getLogger } from '../../utils/logger';
import { SelfCapabilities } from '../capabilities';
import { UnimplementedError } from '../errors';
import { toggleDeafMethod, toggleHandraiseMethod } from '../RPCMessages/utils';

import type { CallParticipant, CallSelfParticipant } from './types/call.types';
import type { SelectDeviceOptions } from './types/participant.types';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { VertoManager } from '../../interfaces/VertoManager';
import type { ScreenShareStatus } from '../../managers/types/verto-manager.types';
import type { JSONRPCResponse } from '../RPCMessages/types/base';
import type { Member, LayoutLayer, MemberTarget } from '../RPCMessages/types/common';
import type { VideoPosition } from '../types/call.types';
import type { MediaOptions } from '../types/media.types';
import type { Observable } from 'rxjs';

const logger = getLogger();

/**
 * Callback type for executing call methods
 * Injected to avoid circular dependency with Call class
 */
export type ExecuteMethod = <T extends JSONRPCResponse = JSONRPCResponse>(
  target: string | MemberTarget,
  method: string,
  args: Record<string, unknown>
) => Promise<T>;

type ParticipantState = Member & { position: LayoutLayer };

const initialState: Partial<ParticipantState> = {};

/**
 * Represents a participant in a call.
 *
 * Provides observable state (audio/video mute, hand raise, volume, etc.)
 * and control methods for the participant. See {@link SelfParticipant} for
 * the local participant with additional device control.
 */
export class Participant extends Destroyable implements CallParticipant {
  /** Unique member ID of this participant. */
  public readonly id!: string;
  private _state$ = this.createBehaviorSubject<Partial<ParticipantState>>(initialState);
  constructor(
    id: string,
    protected executeMethod: ExecuteMethod,
    protected deviceController: DeviceController
  ) {
    super();
    this.id = id;
  }
  /** @internal */
  public upnext(data: Partial<ParticipantState>): void {
    this._state$.next({ ...this._state$.value, ...data });
  }

  /** Observable of the participant's display name. */
  public get name$(): Observable<string | undefined> {
    return this.cachedObservable('name$', () =>
      this._state$.pipe(
        map((state) => state.name),
        distinctUntilChanged()
      )
    );
  }

  /** Observable of the participant type (e.g. `'member'`, `'screen'`). */
  public get type$(): Observable<string | undefined> {
    return this.cachedObservable('type$', () =>
      this._state$.pipe(
        map((state) => state.type),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant has raised their hand. */
  public get handraised$(): Observable<boolean | undefined> {
    return this.cachedObservable('handraised$', () =>
      this._state$.pipe(
        map((state) => state.handraised),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant is visible in the layout. */
  public get visible$(): Observable<boolean | undefined> {
    return this.cachedObservable('visible$', () =>
      this._state$.pipe(
        map((state) => state.visible),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant's audio is muted. */
  public get audioMuted$(): Observable<boolean | undefined> {
    return this.cachedObservable('audioMuted$', () =>
      this._state$.pipe(
        map((state) => state.audio_muted),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant's video is muted. */
  public get videoMuted$(): Observable<boolean | undefined> {
    return this.cachedObservable('videoMuted$', () =>
      this._state$.pipe(
        map((state) => state.video_muted),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant is deafened. */
  public get deaf$(): Observable<boolean | undefined> {
    return this.cachedObservable('deaf$', () =>
      this._state$.pipe(
        map((state) => state.deaf),
        distinctUntilChanged()
      )
    );
  }

  /**
   * Observable of the participant's **server-side** microphone input volume
   * as reported by the mix engine. This is gain applied on the bridged audio
   * leg (FreeSWITCH channel read volume), NOT the local browser mic. For a
   * local PC mic control, see {@link Call.setLocalMicrophoneGain}.
   *
   * @see {@link setAudioInputVolume}
   */
  public get inputVolume$(): Observable<number | undefined> {
    return this.cachedObservable('inputVolume$', () =>
      this._state$.pipe(
        map((state) => state.input_volume),
        distinctUntilChanged()
      )
    );
  }

  /**
   * Observable of the participant's **server-side** speaker output volume as
   * reported by the mix engine (FreeSWITCH channel write volume). NOT the
   * local HTML `<audio>` element volume — set that on your own element.
   *
   * @see {@link setAudioOutputVolume}
   */
  public get outputVolume$(): Observable<number | undefined> {
    return this.cachedObservable('outputVolume$', () =>
      this._state$.pipe(
        map((state) => state.output_volume),
        distinctUntilChanged()
      )
    );
  }

  /**
   * Observable of the **conference-only** microphone energy/gate sensitivity
   * level for this member. Routes through the conferencing mix engine and has
   * no effect on 1:1 WebRTC calls. Populated from `member.updated` events for
   * conference members.
   *
   * @see {@link setAudioInputSensitivity}
   */
  public get inputSensitivity$(): Observable<number | undefined> {
    return this.cachedObservable('inputSensitivity$', () =>
      this._state$.pipe(
        map((state) => state.input_sensitivity),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether echo cancellation is enabled. */
  public get echoCancellation$(): Observable<boolean | undefined> {
    return this.cachedObservable('echoCancellation$', () =>
      this._state$.pipe(
        map((state) => state.echo_cancellation),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether auto-gain control is enabled. */
  public get autoGain$(): Observable<boolean | undefined> {
    return this.cachedObservable('autoGain$', () =>
      this._state$.pipe(
        map((state) => state.auto_gain),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether noise suppression is enabled. */
  public get noiseSuppression$(): Observable<boolean | undefined> {
    return this.cachedObservable('noiseSuppression$', () =>
      this._state$.pipe(
        map((state) => state.noise_suppression),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether low-bitrate mode is active. */
  public get lowbitrate$(): Observable<boolean | undefined> {
    return this.cachedObservable('lowbitrate$', () =>
      this._state$.pipe(
        map((state) => state.lowbitrate),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether noise reduction is active. */
  public get denoise$(): Observable<boolean | undefined> {
    return this.cachedObservable('denoise$', () =>
      this._state$.pipe(
        map((state) => state.denoise),
        distinctUntilChanged()
      )
    );
  }

  /** Observable of custom metadata for this participant. */
  public get meta$(): Observable<Record<string, unknown> | undefined> {
    return this.cachedObservable('meta$', () =>
      this._state$.pipe(
        map((state) => state.meta),
        distinctUntilChanged()
      )
    );
  }

  /** Observable of the participant's user ID. */
  public get userId$(): Observable<string | undefined> {
    return this.cachedObservable('userId$', () =>
      this._state$.pipe(
        map((state) => state.subscriber_id),
        distinctUntilChanged()
      )
    );
  }

  /** Observable of the participant's address ID. */
  public get addressId$(): Observable<string | undefined> {
    return this.cachedObservable('addressId$', () =>
      this._state$.pipe(
        map((state) => state.address_id),
        distinctUntilChanged()
      )
    );
  }

  /** Observable of the server node ID for this participant. */
  public get nodeId$(): Observable<string | undefined> {
    return this.cachedObservable('nodeId$', () =>
      this._state$.pipe(
        map((state) => state.node_id),
        distinctUntilChanged()
      )
    );
  }

  /** Observable indicating whether the participant is currently speaking. */
  public get isTalking$(): Observable<boolean | undefined> {
    return this.cachedObservable('isTalking$', () =>
      this._state$.pipe(
        map((state) => state.talking),
        distinctUntilChanged()
      )
    );
  }

  /** Whether the participant is currently speaking. */
  public get isTalking(): boolean {
    return this._state$.value.talking ?? false;
  }

  /** Observable of the participant's layout position. */
  public get position$(): Observable<LayoutLayer | undefined> {
    return this.cachedObservable('position$', () =>
      this._state$.pipe(
        map((state) => state.position),
        distinctUntilChanged()
      )
    );
  }

  /** Current layout position. */
  public get position(): LayoutLayer | undefined {
    return this._state$.value.position;
  }

  /** Whether the participant is an audience member (view-only). */
  public get isAudience(): boolean {
    return this._state$.value.isAudience ?? false;
  }

  /** Display name of this participant. */
  public get name(): string | undefined {
    return this._state$.value.name;
  }

  /** Participant type (e.g. `'member'`, `'screen'`). */
  public get type(): string | undefined {
    return this._state$.value.type;
  }

  /** Whether the participant has raised their hand. */
  public get handraised(): boolean {
    return this._state$.value.handraised ?? false;
  }

  /** Whether the participant is visible in the layout. */
  public get visible(): boolean {
    return this._state$.value.visible ?? false;
  }

  /** Whether the participant's audio is muted. */
  public get audioMuted(): boolean {
    return this._state$.value.audio_muted ?? false;
  }

  /** Whether the participant's video is muted. */
  public get videoMuted(): boolean {
    return this._state$.value.video_muted ?? false;
  }

  /** Whether the participant is deafened (incoming audio muted). */
  public get deaf(): boolean {
    return this._state$.value.deaf ?? false;
  }

  /**
   * Current **server-side** microphone input volume as reported by the mix
   * engine, or `undefined` if not set. Not the local PC mic — see
   * {@link Call.setLocalMicrophoneGain} for browser-side control.
   */
  public get inputVolume(): number | undefined {
    return this._state$.value.input_volume;
  }

  /**
   * Current **server-side** speaker output volume from the mix engine, or
   * `undefined` if not set. Not the local `<audio>` element volume.
   */
  public get outputVolume(): number | undefined {
    return this._state$.value.output_volume;
  }

  /**
   * Current **conference-only** microphone sensitivity/gate level, or
   * `undefined` if not set. Applies only to conference members.
   */
  public get inputSensitivity(): number | undefined {
    return this._state$.value.input_sensitivity;
  }

  /** Whether echo cancellation is enabled. */
  public get echoCancellation(): boolean {
    return this._state$.value.echo_cancellation ?? false;
  }

  /** Whether automatic gain control is enabled. */
  public get autoGain(): boolean {
    return this._state$.value.auto_gain ?? false;
  }

  /** Whether noise suppression is enabled. */
  public get noiseSuppression(): boolean {
    return this._state$.value.noise_suppression ?? false;
  }

  /** Whether low-bitrate mode is active. */
  public get lowbitrate(): boolean {
    return this._state$.value.lowbitrate ?? false;
  }

  /** Whether noise reduction (denoise) is active. */
  public get denoise(): boolean {
    return this._state$.value.denoise ?? false;
  }

  /** Custom metadata for this participant, or `undefined` if not set. */
  public get meta(): Record<string, unknown> | undefined {
    return this._state$.value.meta;
  }

  /** User ID of this participant, or `undefined` if not available. */
  public get userId(): string | undefined {
    return this._state$.value.subscriber_id;
  }

  /** Address ID of this participant, or `undefined` if not available. */
  public get addressId(): string | undefined {
    return this._state$.value.address_id;
  }

  /** Server node ID for this participant, or `undefined` if not available. */
  public get nodeId(): string | undefined {
    return this._state$.value.node_id;
  }

  /** Call ID for this participant's leg, or `undefined` if not available. */
  public get callId(): string | undefined {
    return this._state$.value.call_id;
  }

  /** @internal */
  public get value(): Partial<Member> {
    return this._state$.value;
  }

  /** Toggles the deafened state (mutes/unmutes incoming audio). */
  public async toggleDeaf(): Promise<void> {
    const method = toggleDeafMethod(this.deaf);
    const params = {};
    await this.executeMethod(this.id, method, params);
  }

  /** Toggles the hand-raised state. */
  public async toggleHandraise(): Promise<void> {
    await this.executeMethod(this.id, toggleHandraiseMethod(this.handraised), {});
  }

  /** Mutes the participant's audio. */
  public async mute(): Promise<void> {
    await this.executeMethod(this.id, 'call.mute', { channels: ['audio'] });
  }

  /** Unmutes the participant's audio. */
  public async unmute(): Promise<void> {
    await this.executeMethod(this.id, 'call.unmute', { channels: ['audio'] });
  }

  /** Toggles the participant's audio mute state. */
  public async toggleMute(): Promise<void> {
    return this.audioMuted ? this.unmute() : this.mute();
  }

  /** Mutes the participant's video. */
  public async muteVideo(): Promise<void> {
    await this.executeMethod(this.id, 'call.mute', { channels: ['video'] });
  }

  /** Unmutes the participant's video. */
  public async unmuteVideo(): Promise<void> {
    await this.executeMethod(this.id, 'call.unmute', { channels: ['video'] });
  }

  /** Toggles the participant's video mute state. */
  public async toggleMuteVideo(): Promise<void> {
    return this.videoMuted ? this.unmuteVideo() : this.muteVideo();
  }

  /** Toggles echo cancellation on the audio input. */
  public async toggleEchoCancellation(): Promise<void> {
    await this.executeMethod(this.id, 'call.audioflags.set', {
      echo_cancellation: !this.echoCancellation,
      auto_gain: this.autoGain,
      noise_suppression: this.noiseSuppression
    });
  }

  /** Toggles automatic gain control on the audio input. */
  public async toggleAudioInputAutoGain(): Promise<void> {
    await this.executeMethod(this.id, 'call.audioflags.set', {
      echo_cancellation: this.echoCancellation,
      auto_gain: !this.autoGain,
      noise_suppression: this.noiseSuppression
    });
  }

  /** Toggles noise suppression on the audio input. */
  public async toggleNoiseSuppression(): Promise<void> {
    await this.executeMethod(this.id, 'call.audioflags.set', {
      echo_cancellation: this.echoCancellation,
      auto_gain: this.autoGain,
      noise_suppression: !this.noiseSuppression
    });
  }

  /** Toggles low-bitrate mode for this participant's media. */
  public async toggleLowbitrate(): Promise<void> {
    await this.executeMethod(this.id, 'call.lowbitrate.set', {
      lowbitrate: !this.lowbitrate
    });
  }

  /**
   * Adjusts the **conference-only** microphone energy gate / sensitivity level
   * for this member. Routes through the conferencing mix engine
   * (`signalwire.conferencing member.set_input_sensitivity`) and has no effect
   * on 1:1 WebRTC calls — for those, use browser audio constraints via
   * {@link Call.setNoiseSuppression} / {@link Call.setAutoGainControl}.
   *
   * This is **not** a local PC mic gain control; it only changes how the
   * server-side mixer decides to open the mic gate on this participant.
   *
   * @param value - Sensitivity level as understood by the conference engine
   *   (integer, larger values are more sensitive).
   */
  public async setAudioInputSensitivity(value: number): Promise<void> {
    await this.executeMethod(this.id, 'call.microphone.sensitivity.set', {
      sensitivity: value
    });
  }

  /**
   * Sets the **server-side** microphone volume on this participant's bridged
   * call leg. Applies a multiplier to the audio flowing through the mix
   * engine (FreeSWITCH channel read volume) — changes what other participants
   * hear, not what the local browser captures.
   *
   * For local PC mic gain, use {@link Call.setLocalMicrophoneGain} instead.
   *
   * @param value - Volume level (0-100).
   */
  public async setAudioInputVolume(value: number): Promise<void> {
    await this.executeMethod(this.id, 'call.microphone.volume.set', {
      volume: value
    });
  }

  /**
   * Sets the **server-side** speaker volume on this participant's bridged call
   * leg (FreeSWITCH channel write volume) — what this participant hears from
   * the mix before it reaches their client.
   *
   * For local playback volume (the `<audio>` element the consumer attaches
   * `remoteStream` to), set `audioElement.volume` directly in the consumer's
   * code.
   *
   * @param value - Volume level (0-100).
   */
  public async setAudioOutputVolume(value: number): Promise<void> {
    await this.executeMethod(this.id, 'call.speaker.volume.set', {
      volume: value
    });
  }

  /**
   * Sets the participant's position in the video layout.
   *
   * Requires the `member.position` capability. The gateway keys positions by the
   * **target member's own** `call_id`/`node_id` (see issue #19400 and the legacy
   * `setPositions` implementation), so this sends the participant's own call
   * context — matching {@link Participant.remove}. A resolved promise does not
   * guarantee a visible change: the backend silently returns `200` (no-op) for
   * non-conference targets.
   *
   * @param value - The {@link VideoPosition} to assign (e.g. `'auto'`, `'reserved-0'`).
   */
  public async setPosition(value: VideoPosition): Promise<void> {
    const state = this._state$.value;
    const target: MemberTarget = {
      member_id: this.id,
      call_id: state.call_id ?? '',
      node_id: state.node_id ?? ''
    };
    await this.executeMethod(target, 'call.member.position.set', {
      targets: [{ target, position: value }]
    });
  }

  /** Removes this participant from the call. */
  public async remove(): Promise<void> {
    const state = this._state$.value;
    const target: MemberTarget = {
      member_id: this.id,
      call_id: state.call_id ?? '',
      node_id: state.node_id ?? ''
    };
    await this.executeMethod(target, 'call.member.remove', {});
  }

  /** Ends the call for this participant. */
  public async end(): Promise<void> {
    await this.executeMethod(this.id, 'call.end', {});
  }

  /**
   * Replaces custom metadata for this participant.
   * @param _meta - Metadata object to set.
   * @throws {UnimplementedError} Not yet implemented.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async setMeta(_meta: Record<string, unknown>): Promise<void> {
    // NEEDS backend implementation
    throw new UnimplementedError();
  }
  /**
   * Merges values into custom metadata (unlike {@link setMeta} which replaces).
   * @param _meta - Metadata to merge.
   * @throws {UnimplementedError} Not yet implemented.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async updateMeta(_meta: Record<string, unknown>): Promise<void> {
    // NEEDS backend implementation
    throw new UnimplementedError();
  }

  /** Destroys the participant, releasing all subscriptions and references. */
  public destroy(): void {
    // Cleanup callback reference - intentionally breaking type safety for cleanup
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    this.executeMethod = undefined as any;
    super.destroy();
  }
}

/**
 * The local participant in a call, with additional device and media control.
 *
 * Extends {@link Participant} with screen sharing, device selection,
 * and local media stream management.
 */
export class SelfParticipant extends Participant implements CallSelfParticipant {
  /**
   * Capabilities for this participant.
   * Contains all capability flags as both observables and values.
   */
  public readonly capabilities: SelfCapabilities;

  /**
   * Studio audio mode state. When enabled, all audio processing
   * (echo cancellation, noise suppression, auto gain control) is disabled
   * to provide raw/unprocessed audio for musicians, podcasters, etc.
   */
  private _studioAudio$ = this.createBehaviorSubject<boolean>(false);

  /** @internal */
  constructor(
    id: string,
    executeMethod: ExecuteMethod,
    private vertoManager: VertoManager,
    deviceController: DeviceController
  ) {
    super(id, executeMethod, deviceController);
    this.capabilities = new SelfCapabilities();
  }

  public override destroy(): void {
    this.capabilities.destroy();
    super.destroy();
  }

  /** Observable indicating whether studio audio (raw/unprocessed audio) mode is enabled. */
  public get studioAudio$(): Observable<boolean> {
    return this._studioAudio$.asObservable();
  }

  /** Whether studio audio (raw/unprocessed audio) mode is currently enabled. */
  public get studioAudio(): boolean {
    return this._studioAudio$.value;
  }

  /**
   * Enables studio audio mode by disabling all audio processing.
   * Sets echoCancellation, noiseSuppression, and autoGainControl to false.
   */
  public async enableStudioAudio(): Promise<void> {
    if (this._studioAudio$.value) {
      return;
    }
    this._studioAudio$.next(true);
    await this.executeMethod(this.id, 'call.audioflags.set', {
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: false
    });
  }

  /**
   * Disables studio audio mode by restoring all audio processing to enabled.
   * Sets echoCancellation, noiseSuppression, and autoGainControl to true.
   */
  public async disableStudioAudio(): Promise<void> {
    if (!this._studioAudio$.value) {
      return;
    }
    this._studioAudio$.next(false);
    await this.executeMethod(this.id, 'call.audioflags.set', {
      echo_cancellation: true,
      auto_gain: true,
      noise_suppression: true
    });
  }

  /** Starts sharing the local screen. */
  public async startScreenShare(): Promise<void> {
    try {
      await this.vertoManager.addScreenMedia();
    } catch (error) {
      logger.error('[Participant.startScreenShare] Screen share error:', error);
    }
  }

  /** Observable of the current screen share status. */
  public get screenShareStatus$(): Observable<ScreenShareStatus> {
    return this.vertoManager.screenShareStatus$;
  }

  /** Current screen share status. */
  public get screenShareStatus(): ScreenShareStatus {
    return this.vertoManager.screenShareStatus;
  }

  /** Stops the current screen share. */
  public async stopScreenShare(): Promise<void> {
    return this.vertoManager.removeScreenMedia();
  }

  /** Adds an additional media input device to the call. */
  public async addAdditionalDevice(options: MediaOptions): Promise<void> {
    try {
      await this.vertoManager.addInputDevice(options);
    } catch (error) {
      logger.error('[Participant.startScreenShare] Screen share error:', error);
    }
  }

  /** Removes an additional media input device by ID. */
  public async removeAdditionalDevice(id: string): Promise<void> {
    return this.vertoManager.removeInputDevices(id);
  }

  /** Adds or replaces the primary audio input device with optional constraints or stream. */
  public async addAudioInputDevice({
    constraints,
    stream
  }: {
    constraints?: MediaTrackConstraints;
    stream?: MediaStream;
  } = {}): Promise<void> {
    const audio = (constraints ?? stream) ? undefined : true;
    return this.vertoManager.addMainInputDevices({
      audio,
      inputAudioDeviceConstraints: constraints,
      inputAudioStream: stream
    });
  }

  /** Adds or replaces the primary video input device with optional constraints or stream. */
  public async addVideoInputDevice({
    constraints,
    stream
  }: {
    constraints?: MediaTrackConstraints;
    stream?: MediaStream;
  } = {}): Promise<void> {
    const video = (constraints ?? stream) ? undefined : true;
    return this.vertoManager.addMainInputDevices({
      video,
      inputVideoDeviceConstraints: constraints,
      inputVideoStream: stream
    });
  }

  /** Adds or replaces primary input devices (audio and/or video). */
  public async addInputDevices(options: MediaOptions = {}): Promise<void> {
    await this.vertoManager.addMainInputDevices(options);
  }

  /** Selects the audio input device for future calls. Optionally saves as a preference. */
  public selectAudioInputDevice(device: MediaDeviceInfo, options: SelectDeviceOptions = {}): void {
    this.deviceController.selectAudioInputDevice(device);
    if (options.savePreference) {
      PreferencesContainer.instance.preferredAudioInput = device;
    }
  }

  /** Updates the audio input track constraints for the active call. */
  public async setAudioInputDeviceConstraints(constraints: MediaTrackConstraints): Promise<void> {
    await this.vertoManager.updateMediaConstraints({ audio: constraints });
  }

  /** Updates both audio and video input track constraints for the active call. */
  public async setInputDevicesConstraints(constraints: {
    audio: MediaTrackConstraints;
    video: MediaTrackConstraints;
  }): Promise<void> {
    await this.vertoManager.updateMediaConstraints(constraints);
  }

  /** Selects the video input device for future calls. Optionally saves as a preference. */
  public selectVideoInputDevice(device: MediaDeviceInfo, options: SelectDeviceOptions = {}): void {
    this.deviceController.selectVideoInputDevice(device);
    if (options.savePreference) {
      PreferencesContainer.instance.preferredVideoInput = device;
    }
  }

  /** Updates the video input track constraints for the active call. */
  public async setVideoInputDeviceConstraints(constraints: MediaTrackConstraints): Promise<void> {
    await this.vertoManager.updateMediaConstraints({ video: constraints });
  }

  /** Selects the audio output device. Optionally saves as a preference. */
  public selectAudioOutputDevice(device: MediaDeviceInfo, options: SelectDeviceOptions = {}): void {
    this.deviceController.selectAudioOutputDevice(device);
    if (options.savePreference) {
      PreferencesContainer.instance.preferredAudioOutput = device;
    }
  }

  /**
   * Exits studio audio mode without restoring defaults.
   * Called internally before individual audio flag toggles.
   */
  private exitStudioModeIfActive(): void {
    if (this._studioAudio$.value) {
      logger.debug('[SelfParticipant] Exiting studio audio mode due to individual flag toggle');
      this._studioAudio$.next(false);
    }
  }

  /** Toggles echo cancellation. Exits studio mode if active. */
  public override async toggleEchoCancellation(): Promise<void> {
    this.exitStudioModeIfActive();
    await super.toggleEchoCancellation();
  }

  /** Toggles automatic gain control. Exits studio mode if active. */
  public override async toggleAudioInputAutoGain(): Promise<void> {
    this.exitStudioModeIfActive();
    await super.toggleAudioInputAutoGain();
  }

  /** Toggles noise suppression. Exits studio mode if active. */
  public override async toggleNoiseSuppression(): Promise<void> {
    this.exitStudioModeIfActive();
    await super.toggleNoiseSuppression();
  }

  /** Mutes local audio. Falls back to local device mute if the server RPC fails. */
  public async mute(): Promise<void> {
    try {
      await super.mute();
    } catch (error) {
      logger.warn(
        '[Participant.toggleAudioInput] Server Error while muting audio input, proceeding with local toggle anyway',
        error
      );
    } finally {
      this.vertoManager.muteMainAudioInputDevice();
    }
  }

  /** Unmutes local audio. Falls back to local device unmute if the server RPC fails. */
  public async unmute(): Promise<void> {
    try {
      await super.unmute();
    } catch (error) {
      logger.warn(
        '[Participant.toggleAudioInput] Server Error while unmuting audio input, proceeding with local toggle anyway',
        error
      );
    } finally {
      await this.vertoManager.unmuteMainAudioInputDevice();
    }
  }

  /** Mutes local video. Falls back to local device mute if the server RPC fails. */
  public async muteVideo(): Promise<void> {
    try {
      await super.muteVideo();
    } catch (error) {
      logger.warn(
        '[Participant.toggleVideoInput] Server Error while muting video input, proceeding with local toggle anyway',
        error
      );
    } finally {
      this.vertoManager.muteMainVideoInputDevice();
    }
  }

  /** Unmutes local video. Falls back to local device unmute if the server RPC fails. */
  public async unmuteVideo(): Promise<void> {
    try {
      await super.unmuteVideo();
    } catch (error) {
      logger.warn(
        '[Participant.toggleVideoInput] Server Error while unmuting video input, proceeding with local toggle anyway',
        error
      );
    } finally {
      await this.vertoManager.unmuteMainVideoInputDevice();
    }
  }
}

/** Type guard that checks if a participant is the local {@link SelfParticipant}. */
export const isSelfParticipant = (participant: Participant): participant is SelfParticipant => {
  return participant instanceof SelfParticipant;
};
