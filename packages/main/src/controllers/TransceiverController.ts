import { Destroyable } from '../behaviors/Destroyable';
import { MediaTrackError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { LocalStreamController } from './LocalStreamController';
import type { RTCPeerConnectionPropose } from '../core/types/call.types';

const logger = getLogger();

const getDirection = (send: boolean, recv: boolean): RTCRtpTransceiverDirection => {
  if (send && recv) {
    return 'sendrecv';
  } else if (send && !recv) {
    return 'sendonly';
  } else if (!send && recv) {
    return 'recvonly';
  }

  return 'inactive';
};

export interface TransceiverControllerOptions {
  peerConnection: RTCPeerConnection;
  propose: RTCPeerConnectionPropose;
  simulcast?: boolean;
  sfu?: boolean;
  msStreamsNumber?: number;
  receiveAudio?: boolean;
  receiveVideo?: boolean;
  localStreamController: LocalStreamController;
  getInputAudioDeviceConstraints: () => MediaTrackConstraints | boolean;
  getInputVideoDeviceConstraints: () => MediaTrackConstraints | boolean;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  onError?: (error: Error) => void;
}

export class TransceiverController extends Destroyable {
  private peerConnection: RTCPeerConnection;
  private options: TransceiverControllerOptions;

  constructor(options: TransceiverControllerOptions) {
    super();
    this.peerConnection = options.peerConnection;
    this.options = options;
  }

  public get useAddTransceivers(): boolean {
    return typeof this.peerConnection.addTransceiver === 'function';
  }

  public get useAddTrack(): boolean {
    return typeof this.peerConnection.addTrack === 'function';
  }

  public get useAddStream(): boolean {
    return (
      // @ts-expect-error -- Ignore ---
      typeof this.peerConnection.addStream === 'function' &&
      !this.useAddTransceivers &&
      !this.useAddTrack
    );
  }

  private get propose(): RTCPeerConnectionPropose {
    return this.options.propose;
  }

  private get isAdditionalDevice(): boolean {
    return this.propose === 'additional-device';
  }

  private get isScreenShare(): boolean {
    return this.propose === 'screenshare';
  }

  private get isSimulcast(): boolean {
    return Boolean(this.options.simulcast);
  }

  private get isSFU(): boolean {
    return Boolean(this.options.sfu);
  }

  private get receiveVideo(): boolean {
    return Boolean(this.options.receiveVideo);
  }

  private get receiveAudio(): boolean {
    return Boolean(this.options.receiveAudio);
  }

  private get localStream(): MediaStream | null {
    return this.options.localStreamController.localStream;
  }

  private get inputAudioDeviceConstraints(): MediaTrackConstraints | boolean {
    return this.options.getInputAudioDeviceConstraints();
  }

  private get inputVideoDeviceConstraints(): MediaTrackConstraints | boolean {
    return this.options.getInputVideoDeviceConstraints();
  }

  public get audioDirection(): RTCRtpTransceiverDirection {
    if (this.isAdditionalDevice) {
      return 'sendonly';
    }
    const { localStream } = this;
    const hasAudioTrack = localStream?.getAudioTracks().some((track) => track.enabled);
    const wantsToSendAudio = Boolean(this.inputAudioDeviceConstraints);
    const wantsToReceiveAudio = Boolean(this.receiveAudio);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- .some() returns boolean; ?? doesn't fall through on false
    const send = hasAudioTrack || wantsToSendAudio;
    const recv = wantsToReceiveAudio;
    return getDirection(send, recv);
  }

  public get videoDirection(): RTCRtpTransceiverDirection {
    if (this.isAdditionalDevice || this.isScreenShare) {
      return 'sendonly';
    }

    if (this.isSFU) {
      return 'recvonly';
    }

    const { localStream } = this;
    const hasVideoTrack = localStream?.getVideoTracks().some((track) => track.enabled);
    const wantsToSendVideo = Boolean(this.inputVideoDeviceConstraints);
    const wantsToReceiveVideo = Boolean(this.receiveVideo);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- .some() returns boolean; ?? doesn't fall through on false
    const send = hasVideoTrack || wantsToSendVideo;
    const recv = wantsToReceiveVideo;
    return getDirection(send, recv);
  }

  private get sendEncodings(): RTCRtpEncodingParameters[] | undefined {
    if (!this.isSimulcast) {
      return undefined;
    }

    return ['0', '1', '2'].map((rid) => ({
      active: true,
      rid,
      scaleResolutionDownBy: Number(rid) * 6 || 1.0
    }));
  }

  /**
   * Resolve the current MediaTrackConstraints for an input kind, normalising
   * boolean shorthand to an empty object. Public so the surrounding
   * RTCPeerConnectionController can drive its own pipeline-aware getUserMedia
   * call with the same effective constraints the transceiver would have used.
   */
  public getConstraintsFor(kind: 'audio' | 'video'): MediaTrackConstraints {
    const constraints =
      kind === 'audio' ? this.inputAudioDeviceConstraints : this.inputVideoDeviceConstraints;

    // If constraints is a boolean (true/false), return empty object for track constraints
    // false case means no media of this kind is requested, but that's handled elsewhere
    return typeof constraints === 'boolean' ? {} : constraints;
  }

  public transceiverByKind(kind: 'audio' | 'video' | 'both'): RTCRtpTransceiver[] {
    return this.peerConnection
      .getTransceivers()
      .filter((t) => kind === 'both' || t.receiver.track.kind === kind);
  }

  public get audioTransceivers(): RTCRtpTransceiver[] {
    return this.transceiverByKind('audio');
  }

  public get videoTransceivers(): RTCRtpTransceiver[] {
    return this.transceiverByKind('video');
  }

  public async setupTransceiverSender(
    track: MediaStreamTrack,
    localStream: MediaStream,
    transceiver?: RTCRtpTransceiver
  ): Promise<void> {
    const isAudio = track.kind === 'audio';
    const direction = isAudio ? this.audioDirection : this.videoDirection;
    const transceiverParams: RTCRtpTransceiverInit = {
      direction,
      sendEncodings: isAudio ? undefined : this.sendEncodings,
      streams: direction === 'recvonly' ? undefined : [localStream]
    };
    logger.debug(
      `[TransceiverController] Setting up transceiver sender for local ${track.kind} track:`,
      { transceiver, transceiverParams }
    );
    if (
      transceiverParams.direction &&
      ['sendonly', 'sendrecv'].includes(transceiverParams.direction)
    ) {
      if (transceiver) {
        await transceiver.sender.replaceTrack(track);
        // eslint-disable-next-line no-param-reassign
        transceiver.direction = transceiverParams.direction;
        if (transceiverParams.streams?.some((stream) => Boolean(stream))) {
          logger.debug(
            `[TransceiverController] Setting streams for transceiver sender for local ${track.kind} track:`,
            transceiverParams.streams
          );
          transceiver.sender.setStreams(...transceiverParams.streams);
        }
      } else {
        logger.debug(
          `[TransceiverController] Adding new transceiver for local ${track.kind} track:`,
          track.id
        );
        this.peerConnection.addTransceiver(track, transceiverParams);
      }
    }
  }

  public stopTrackSender(
    kind: 'audio' | 'video' | 'both',
    options = { updateTransceiverDirection: false }
  ): void {
    try {
      const transceivers = this.transceiverByKind(kind);
      for (const transceiver of transceivers) {
        if (transceiver.sender.track?.readyState === 'live') {
          const trackId = transceiver.sender.track.id;
          transceiver.sender.track.stop();
          this.options.localStreamController.removeTrack(trackId);
          if (options.updateTransceiverDirection) {
            transceiver.direction = 'inactive';
          }
        }
      }
    } catch (error) {
      logger.error('[TransceiverController] stopTrackSender error', kind, error);
      this.options.onError?.(new MediaTrackError('stopTrackSender', kind, error));
    }
  }

  public async restoreTrackSender(kind: 'audio' | 'video' | 'both'): Promise<void> {
    try {
      logger.debug('[TransceiverController] restoreTrackSender called', kind);
      const constraints: MediaStreamConstraints = {};
      const transceivers = this.transceiverByKind(kind);
      for (const transceiver of transceivers) {
        const { track } = transceiver.sender;
        // Check if track is null, ended - all need restoration
        const needsRestore = !track || track.readyState === 'ended';
        if (needsRestore) {
          const trackKind = track?.kind ?? transceiver.receiver.track.kind;
          if (trackKind === 'audio' || trackKind === 'video') {
            constraints[trackKind] = this.getConstraintsFor(trackKind);
          }
        }
      }

      logger.debug('[TransceiverController] restoreTrackSender constraints:', constraints);

      // Don't call getUserMedia if no tracks need restoration
      if (Object.keys(constraints).length === 0) {
        logger.warn('[TransceiverController] restoreTrackSender: no tracks need restoration', kind);
        return;
      }

      const stream = await this.options.getUserMedia(constraints);
      const newTracks = stream.getTracks();

      logger.debug('[TransceiverController] restoreTrackSender new tracks:', newTracks);
      for (const newTrack of newTracks) {
        this.options.localStreamController.addTrack(newTrack);
        const trackKind = newTrack.kind as 'audio' | 'video';
        const transceiverOfKind = this.transceiverByKind(trackKind)[0];
        transceiverOfKind.direction =
          trackKind === 'audio' ? this.audioDirection : this.videoDirection;
        logger.debug(
          '[TransceiverController] restoreTrackSender setting direction for',
          trackKind,
          transceiverOfKind.direction
        );
        await transceiverOfKind.sender.replaceTrack(newTrack);
      }
    } catch (error) {
      logger.error('[TransceiverController] restoreTrackSender error', kind, error);
      this.options.onError?.(new MediaTrackError('restoreTrackSender', kind, error));
    }
  }

  public async replaceSenderTrack(kind: 'audio' | 'video', track: MediaStreamTrack): Promise<void> {
    const transceivers = kind === 'audio' ? this.audioTransceivers : this.videoTransceivers;
    for (const transceiver of transceivers) {
      await transceiver.sender.replaceTrack(track);
    }
  }

  public async setupRemoteTransceivers(type: 'offer' | 'answer'): Promise<void> {
    if (type === 'answer') {
      // remote setup was made by the offerer
      return;
    }

    for (const kind of ['audio', 'video']) {
      const transceivers = kind === 'audio' ? this.audioTransceivers : this.videoTransceivers;
      for (const transceiver of transceivers) {
        const direction = kind === 'audio' ? this.audioDirection : this.videoDirection;

        if (['inactive', 'recvonly'].includes(direction)) {
          transceiver.direction = direction;
          await transceiver.sender.replaceTrack(null);
          transceiver.sender.setStreams();
        }
      }
    }

    if (this.videoDirection === 'recvonly' && this.isSFU && this.useAddTransceivers) {
      const { msStreamsNumber = 5 } = this.options;
      for (let i = 0; i < Number(msStreamsNumber); i++) {
        this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }
    }
  }

  public async updateSendersConstraints(
    kind: 'audio' | 'video',
    constraints?: MediaTrackConstraints
  ): Promise<void> {
    if (!constraints) {
      this.stopTrackSender(kind);
      return Promise.resolve();
    }

    const senders = this.peerConnection
      .getSenders()
      .filter((sender) => sender.track?.kind === kind && sender.track.readyState === 'live');

    for (const sender of senders) {
      const { track } = sender;
      if (track) {
        const constraintsToApply: MediaTrackConstraints = {
          ...track.getConstraints(),
          ...constraints
        };
        try {
          await track.applyConstraints(constraintsToApply);
          logger.debug(
            `[TransceiverController] Updated ${kind} sender constraints:`,
            constraintsToApply
          );
          logger.debug(
            `[TransceiverController] Updated ${kind} sender constraints:`,
            track.getConstraints()
          );
        } catch (error) {
          logger.warn(
            `[TransceiverController] applyConstraints failed for ${kind} track ${track.id}, attempting track replacement fallback:`,
            error
          );
          try {
            await this.replaceTrackFallback(sender, track, kind, constraintsToApply);
          } catch (fallbackError) {
            logger.warn(
              `[TransceiverController] Track replacement fallback also failed for ${kind} track:`,
              fallbackError
            );
            this.options.onError?.(
              new MediaTrackError('updateSendersConstraints', kind, fallbackError)
            );
          }
        }
      }
    }
  }

  /**
   * Fallback when applyConstraints fails: stop the current track, acquire a new
   * one via getUserMedia with the merged constraints (preserving the current
   * deviceId), replace the sender track, and update the localStream.
   *
   * This is critical for iOS Safari where applyConstraints on audio tracks
   * silently fails or throws.
   */
  private async replaceTrackFallback(
    sender: RTCRtpSender,
    oldTrack: MediaStreamTrack,
    kind: 'audio' | 'video',
    mergedConstraints: MediaTrackConstraints
  ): Promise<void> {
    // Preserve the current deviceId so we stay on the same physical device
    const currentSettings = oldTrack.getSettings();
    const { deviceId } = currentSettings;
    const constraintsWithDevice: MediaTrackConstraints = {
      ...mergedConstraints,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    };

    // Stop the old track
    const trackId = oldTrack.id;
    oldTrack.stop();
    this.options.localStreamController.removeTrack(trackId);

    // Acquire a replacement track
    const stream = await this.options.getUserMedia({ [kind]: constraintsWithDevice });
    const newTrack = stream.getTracks().find((t) => t.kind === kind);

    if (!newTrack) {
      throw new MediaTrackError(
        'replaceTrackFallback',
        kind,
        new Error('getUserMedia returned no track of the requested kind')
      );
    }

    // Replace on the sender and update localStream
    await sender.replaceTrack(newTrack);
    this.options.localStreamController.addTrack(newTrack);

    logger.debug(
      `[TransceiverController] Track replacement fallback succeeded for ${kind}. New track: ${newTrack.id}`
    );
  }

  public getMediaDirections(): {
    audio: RTCRtpTransceiverDirection;
    video: RTCRtpTransceiverDirection;
  } {
    if (this.peerConnection.connectionState === 'connected') {
      // If we are connected let's get the actual directions from the transceivers
      return this.peerConnection.getTransceivers().reduce(
        (acc, transceiver) => {
          return {
            ...acc,
            [transceiver.receiver.track.kind]: transceiver.direction
          };
        },
        { audio: 'inactive', video: 'inactive' }
      );
    }

    return {
      audio: this.audioDirection,
      video: this.videoDirection
    };
  }

  public updatePeerConnection(peerConnection: RTCPeerConnection): void {
    this.peerConnection = peerConnection;
  }

  public updateOptions(options: Partial<TransceiverControllerOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
}
