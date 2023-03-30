import { BaseComponent, EventEmitter, BaseComponentOptions, JSONRPCSubscribeMethod } from '.';
/**
 * Instances of this class are meant to be wrapped by a
 * Proxy that intercepts the `_eventsNamespace` (to tell the
 * BaseComponent it's fine to attach the event listeners)
 * and the `eventChannel`
 * @internal
 */
export declare class BaseConsumer<EventTypes extends EventEmitter.ValidEventTypes> extends BaseComponent<EventTypes> {
    options: BaseComponentOptions<EventTypes>;
    protected subscribeMethod: JSONRPCSubscribeMethod;
    protected subscribeParams?: Record<string, any>;
    private _latestExecuteParams?;
    constructor(options: BaseComponentOptions<EventTypes>);
    private shouldExecuteSubscribe;
    subscribe(): Promise<unknown>;
}
//# sourceMappingURL=BaseConsumer.d.ts.map