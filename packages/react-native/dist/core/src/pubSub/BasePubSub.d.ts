import { BaseComponentOptions, BaseConsumer, JSONRPCSubscribeMethod, SessionEvents, EventEmitter, EventTransform } from '..';
import type { PubSubChannel, InternalPubSubChannel, PubSubEventNames, PubSubPublishParams, PubSubMessageEventName } from '../types/pubSub';
import { PubSubMessage } from './PubSubMessage';
export declare type BasePubSubApiEventsHandlerMapping = Record<PubSubMessageEventName, (message: PubSubMessage) => void> & Record<Extract<SessionEvents, 'session.expiring'>, () => void>;
/**
 * @privateRemarks
 *
 * Each package will have the option to either extend this
 * type or provide their own event mapping.
 */
export declare type BasePubSubApiEvents<T = BasePubSubApiEventsHandlerMapping> = {
    [k in keyof T]: T[k];
};
export declare class BasePubSubConsumer<EventTypes extends EventEmitter.ValidEventTypes = BasePubSubApiEvents> extends BaseConsumer<EventTypes> {
    protected _eventsPrefix: "chat";
    protected subscribeMethod: JSONRPCSubscribeMethod;
    constructor(options: BaseComponentOptions<EventTypes>);
    /** @internal */
    protected getEmitterTransforms(): Map<any, EventTransform>;
    private _getChannelsParam;
    /** @internal */
    protected _setSubscribeParams(params: Record<string, any>): void;
    /** @internal */
    protected _getSubscribeParams({ channels }: {
        channels?: PubSubChannel;
    }): {
        channels: InternalPubSubChannel[];
    };
    /** @internal */
    protected _getUnsubscribeParams({ channels }: {
        channels?: PubSubChannel;
    }): {
        channels: InternalPubSubChannel[];
    };
    private _checkMissingSubscriptions;
    subscribe(channels?: PubSubChannel): Promise<unknown>;
    unsubscribe(channels: PubSubChannel): Promise<void>;
    updateToken(token: string): Promise<void>;
    publish(params: PubSubPublishParams): Promise<unknown>;
    getAllowedChannels(): Promise<import("..").ChatAuthorizationChannels>;
}
export declare const createBasePubSubObject: <PubSubType>(params: BaseComponentOptions<PubSubEventNames>) => PubSubType;
//# sourceMappingURL=BasePubSub.d.ts.map