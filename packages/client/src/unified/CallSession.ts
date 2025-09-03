import {
  connect,
  BaseComponentContract,
  BaseRPCResult,
  ExecuteExtendedOptions,
  Rooms,
  VideoMemberEntity,
  VideoPosition,
  BaseConnectionContract,
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
  SetAudioFlagsParams,
  toSnakeCaseKeys,
  CallLayoutChangedEventParams,
  CallJoinedEventParams,
  CallSessionMethods,
  InstanceMap,
} from '@signalwire/core';
import {
  BaseRoomSessionConnection,
  BaseRoomSessionOptions,
} from '../BaseRoomSession';
import {
  CallSessionContract,
  ExecuteMemberActionParams,
  BaseRoomSessionContract,
  CallSessionEvents,
  RequestMemberParams,
} from '../utils/interfaces';
import { getStorage } from '../utils/storage';
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants';
import { fabricWorker } from './workers';
import { CallSessionMember } from './CallSessionMember';
import { makeAudioElementSaga } from '../features/mediaElements/mediaElementsSagas';
import { CallCapabilitiesContract } from './interfaces/capabilities';
import { createCallSessionValidateProxy } from './utils/validationProxy';

export interface CallSession
  extends CallSessionContract,
    CallSessionMethods,
    BaseRoomSessionContract,
    BaseConnectionContract<CallSessionEvents>,
    BaseComponentContract {}

export interface CallSessionOptions
  extends Omit<BaseRoomSessionOptions, 'customSagas'> {}

export class CallSessionConnection
  extends BaseRoomSessionConnection<CallSessionEvents>
  implements CallSessionContract
{
  private _self?: CallSessionMember;
  private _member?: CallSessionMember;
  private _currentLayoutEvent: CallLayoutChangedEventParams;
  private _capabilities?: CallCapabilitiesContract;
  private _localVideoTrack: MediaStreamTrack | null = null;
  private _instanceMap: Map<string, CallSessionMember> = new Map();

  // Override instanceMap as a public getter with InstanceMap compatibility
  public get instanceMap(): InstanceMap {
    return Object.assign(this._instanceMap, {
      remove: (key: string) => {
        return this._instanceMap.delete(key); // Return boolean to match Map.delete
      },
      getAll: () => {
        return Array.from(this._instanceMap.entries()).map(([key, value]) => ({
          key,
          value,
        }));
      },
      deleteAll: () => {
        this._instanceMap.clear();
      },
    }) as unknown as InstanceMap; // Use type assertion to avoid TS2352
  }

  get localVideoTrack() {
    return this._localVideoTrack;
  }

  set localVideoTrack(track: MediaStreamTrack | null) {
    this._localVideoTrack = track;
  }

  constructor(options: CallSessionOptions) {
    super(options);
    this.initWorker();
  }

  override get memberId() {
    return this._member?.memberId;
  }

  override dialogParams(rtcPeerId: string) {
    const params = super.dialogParams(rtcPeerId);
    params.dialogParams.attach = this.options.attach || this.resuming;
    params.dialogParams.reattaching = this.options.attach || this.resuming;
    return params;
  }

  set currentLayoutEvent(event: CallLayoutChangedEventParams) {
    this._currentLayoutEvent = event;
  }

  get currentLayoutEvent() {
    return this._currentLayoutEvent;
  }

  get currentLayout() {
    return this._currentLayoutEvent?.layout;
  }

  get currentPosition() {
    return this._currentLayoutEvent?.layout.layers.find(
      (layer) => layer.member_id === this.memberId
    )?.position;
  }

  get capabilities(): CallCapabilitiesContract | undefined {
    return this._capabilities;
  }

  set capabilities(capabilities: CallCapabilitiesContract | undefined) {
    this._capabilities = capabilities;
  }

  get selfMember(): CallSessionMember | undefined {
    return this._self;
  }

  set selfMember(member: CallSessionMember | undefined) {
    this._self = member;
  }

  set member(member: CallSessionMember) {
    this._member = member;
  }

  get member(): CallSessionMember {
    return this._member!;
  }

  private initWorker() {
    this.runWorker('fabricWorker', {
      worker: fabricWorker,
    });

    this.runWorker('makeAudioElement', {
      worker: makeAudioElementSaga({
        speakerId: this.options.speakerId,
      }),
    });
  }

  private executeAction<
    InputType,
    OutputType = InputType,
    ParamsType extends MemberCommandParams = MemberCommandParams
  >(
    params: ExecuteMemberActionParams,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
  ) {
    const { method, channel, memberId, extraParams = {} } = params;

    const targetMember =
      !memberId || memberId === 'all'
        ? this.member
        : this.instanceMap.get(memberId);

    if (!targetMember) {
      throw new Error(
        memberId && memberId !== 'all'
          ? `Member ${memberId} not found`
          : 'No target member available'
      );
    }

    return this.execute<InputType, OutputType, ParamsType>(
      {
        method,
        params: {
          ...(channel && { channels: [channel] }),
          self: {
            member_id: this.selfMember?.id,
            call_id: this.selfMember?.callId,
            node_id: this.selfMember?.nodeId,
          },
          target: {
            member_id: memberId === 'all' ? memberId : (targetMember as CallSessionMember).id,
            call_id: (targetMember as CallSessionMember).callId,
            node_id: (targetMember as CallSessionMember).nodeId,
          },
          ...extraParams,
        },
      },
      options
    );
  }

  public override async resume() {
    this.logger.warn(`[resume] Call ${this.id}`);
    if (this.peer?.instance) {
      const { connectionState } = this.peer.instance;
      this.logger.debug(
        `[resume] connectionState for ${this.id} is '${connectionState}'`
      );
      if (['closed', 'failed', 'disconnected'].includes(connectionState)) {
        this.resuming = !this.selfMember;
        this.peer.restartIce();
      }
    }
  }

  public async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once('room.subscribed', (params: CallJoinedEventParams) => {
          getStorage()?.setItem(PREVIOUS_CALLID_STORAGE_KEY, params.call_id);
          resolve();
        });

        this.once('destroy', () => {
          getStorage()?.removeItem(PREVIOUS_CALLID_STORAGE_KEY);
          reject(new Error('Failed to start the call', { cause: this.cause }));
        });

        if (this.options.attach) {
          this.options.prevCallId =
            getStorage()?.getItem(PREVIOUS_CALLID_STORAGE_KEY) ?? undefined;
          this.logger.debug(
            `Trying to reattach to previous call: ${this.options.prevCallId}`
          );
        }

        if (this.options.remoteSdp) {
          await super.answer<CallSession>();
        } else {
          await super.invite<CallSession>();
        }
      } catch (error) {
        this.logger.error('WSClient call start', error);
        reject(error);
      }
    });
  }

  public async audioMute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    });
  }

  public async audioUnmute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    });
  }

  public async videoMute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    });
  }

  public async videoUnmute(params?: MemberCommandParams) {
    const isLocal = !params?.memberId || params.memberId === this.memberId;
    const result = await this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    });

    if (isLocal) {
      try {
        if (!this.localVideoTrack || this.localVideoTrack.readyState === 'ended') {
          const deviceId = this.localVideoTrack?.getSettings().deviceId;
          if (deviceId) {
            // Re-apply the camera with the current deviceId to ensure a fresh track
            await this.updateCamera({ deviceId: { exact: deviceId } });
          } else {
            // If no deviceId is available, request a new video stream with default constraints
            await this.updateCamera({});
          }
        }
        // Ensure the track is enabled and signaled
        this.startOutboundVideo();
        // Trigger WebRTC signaling to update the remote peer
        await this.signalSdpUpdate();
      } catch (error) {
        this.logger.error('Failed to unmute video:', error);
        throw error;
      }
    }

    return result;
  }

  public async deaf(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.deaf',
      memberId: params?.memberId,
    });
  }

  public async undeaf(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.undeaf',
      memberId: params?.memberId,
    });
  }

  public async getLayouts() {
    return this.executeAction<{ layouts: string[] }>(
      {
        method: 'call.layout.list',
      },
      {
        transformResolve: (payload) => ({
          layouts: payload.layouts,
        }),
      }
    );
  }

  public async getMembers() {
    return this.executeAction<{ members: VideoMemberEntity[] }>(
      {
        method: 'call.member.list',
      },
      {
        transformResolve: (payload) => ({
          members: payload.members,
        }),
      }
    );
  }

  public async removeMember(params: Required<MemberCommandParams>) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.member.remove',
      memberId: params.memberId,
    });
  }

  public async setRaisedHand(params?: Rooms.SetRaisedHandRoomParams) {
    const { raised = true, memberId } = params || {};
    return this.executeAction<BaseRPCResult>({
      method: raised ? 'call.raisehand' : 'call.lowerhand',
      memberId,
    });
  }

  public async setLayout(params: Rooms.SetLayoutParams) {
    const extraParams = {
      layout: params.name,
      positions: params.positions,
    };
    return this.executeAction<BaseRPCResult>({
      method: 'call.layout.set',
      extraParams,
    });
  }

  public async setInputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.volume.set',
      memberId: params.memberId,
      extraParams: {
        volume: params.volume,
      },
    });
  }

  public async setOutputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.speaker.volume.set',
      memberId: params.memberId,
      extraParams: {
        volume: params.volume,
      },
    });
  }

  public async setInputSensitivity(params: MemberCommandWithValueParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.sensitivity.set',
      memberId: params.memberId,
      extraParams: {
        sensitivity: params.value,
      },
    });
  }

  public async setPositions(params: Rooms.SetPositionsParams) {
    const targets: {
      target: RequestMemberParams;
      position: VideoPosition;
    }[] = [];

    Object.entries(params.positions).forEach(([key, value]) => {
      const targetMember =
        key === 'self'
          ? this.member
          : this.instanceMap.get(key);

      if (targetMember) {
        targets.push({
          target: {
            member_id: (targetMember as CallSessionMember).id,
            call_id: (targetMember as CallSessionMember).callId,
            node_id: (targetMember as CallSessionMember).nodeId,
          },
          position: value,
        });
      }
    });

    if (!targets.length) {
      throw new Error('Invalid targets');
    }

    return this.execute({
      method: 'call.member.position.set',
      params: {
        self: {
          member_id: this.selfMember?.id,
          call_id: this.selfMember?.callId,
          node_id: this.selfMember?.nodeId,
        },
        targets,
      },
    });
  }

  public async lock() {
    return this.executeAction<BaseRPCResult>({
      method: 'call.lock',
    });
  }

  public async unlock() {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unlock',
    });
  }

  public async setAudioFlags(params: SetAudioFlagsParams) {
    const { memberId, ...rest } = params;
    return this.executeAction<BaseRPCResult>({
      method: 'call.audioflags.set',
      memberId,
      extraParams: toSnakeCaseKeys(rest),
    });
  }

  public async end(params?: MemberCommandParams): Promise<void> {
    await this.executeAction<BaseRPCResult>({
      method: 'call.end',
      memberId: params?.memberId,
    });
  }

  public async updateCamera(constraints: MediaTrackConstraints): Promise<void> {
    try {
      const newTrack = (await navigator.mediaDevices.getUserMedia({ video: constraints })).getVideoTracks()[0];

      const sender = this.peer?.instance?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        this.logger.warn('No video sender found for track replacement');
      }

      this.localVideoTrack = newTrack;

      const self = this.member;
      if (self.videoMuted) {
        this.stopOutboundVideo();
      }

      // Trigger WebRTC signaling to update the remote peer
      await this.signalSdpUpdate();
    } catch (error) {
      this.logger.error('Failed to update camera:', error);
      throw error;
    }
  }

  public startOutboundVideo(): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.enabled = true;
    } else {
      this.logger.warn('No local video track available to enable');
    }
  }

  public stopOutboundVideo(): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.enabled = false;
    }
  }

  // Add method to trigger WebRTC signaling
  private async signalSdpUpdate(): Promise<void> {
    if (!this.peer?.instance) {
      this.logger.warn('No peer connection available for SDP update');
      return;
    }

    try {
      const offer = await this.peer.instance.createOffer();
      await this.peer.instance.setLocalDescription(offer);
      // Assuming a method to send the SDP to the signaling server
      await this.sendSdpToServer(offer);
    } catch (error) {
      this.logger.error('Failed to update SDP:', error);
      throw error;
    }
  }

  // Placeholder for sending SDP to the signaling server
  private async sendSdpToServer(sdp: RTCSessionDescriptionInit): Promise<void> {
    // This is a placeholder; implement the actual signaling logic based on your backend
    this.logger.debug('Sending SDP update:', sdp);
    // Example: await this.execute({ method: 'call.sdp.update', params: { sdp } });
    // Replace with your actual signaling implementation
  }
}

export const isCallSession = (room: unknown): room is CallSession => {
  return room instanceof CallSessionConnection;
};

export const createCallSessionObject = (
  params: CallSessionOptions
): CallSession => {
  const room = connect<CallSessionEvents, CallSessionConnection, CallSession>({
    store: params.store,
    Component: CallSessionConnection,
  })(params);

  return createCallSessionValidateProxy(room);
};
