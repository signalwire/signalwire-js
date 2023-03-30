import type { Task } from '@redux-saga/types';
import { Action } from './redux';
import { ExecuteParams, BaseComponentOptions, ExecuteExtendedOptions, EventsPrefix, EventTransform, SDKWorker, SDKWorkerDefinition, SessionAuthStatus, SDKWorkerHooks, Authorization } from './utils/interfaces';
import { EventEmitter } from './utils/EventEmitter';
import { SDKState } from './redux/interfaces';
import { OnlyStateProperties, EmitterContract, BaseComponentContract } from './types';
export declare const SW_SYMBOL: unique symbol;
export declare class BaseComponent<EventTypes extends EventEmitter.ValidEventTypes, StateProperties = Record<string, unknown>> implements EmitterContract<EventTypes>, BaseComponentContract {
    options: BaseComponentOptions<EventTypes>;
    /** @internal */
    __sw_symbol: symbol;
    /** @internal */
    private readonly uuid;
    /** @internal */
    /** @internal */
    get __uuid(): string;
    /** @internal */
    protected _eventsPrefix: EventsPrefix;
    private _eventsRegisterQueue;
    private _eventsEmitQueue;
    private _eventsNamespace?;
    private _eventsTransformsCache;
    private _customSagaTriggers;
    private _destroyer?;
    private baseEventEmitter;
    private _handleCompoundEvents;
    /**
     * A Namespace let us scope specific instances inside of a
     * particular product (like 'video.', 'chat.', etc.). For instance,
     * when working with a room, the namespace will let us send messages
     * to that specific room.
     */
    private _getNamespacedEvent;
    /**
     * A prefix is a product, like `video` or `chat`.
     */
    private _getPrefixedEvent;
    private _getInternalEvent;
    /**
     * Collection of functions that will be executed before calling the
     * event handlers registered by the end user (when using the Emitter
     * interface).
     */
    private _emitterTransforms;
    /**
     * Keeps track of the stable references used for registering events.
     */
    private _emitterListenersCache;
    /**
     * List of events being registered through the EventEmitter
     * instance. These events include the `_eventsPrefix` but not the
     * `_eventsNamespace`
     */
    private _trackedEvents;
    /**
     * List of running Tasks to be cancelled on `destroy`.
     */
    private _runningWorkers;
    protected get logger(): import("./utils/interfaces").InternalSDKLogger;
    /**
     * Map of Sagas that will be attached to the Store to
     * handle events or perform side-effects. This Map will
     * behave as a queue and will be emptied once the workers
     * have been attached. See `this.attachWorkers` for
     * details.
     */
    protected _workers: Map<string, {
        worker: SDKWorker<any>;
    }>;
    constructor(options: BaseComponentOptions<EventTypes>);
    /** @internal */
    set destroyer(d: () => void);
    /** @internal */
    get store(): {
        runSaga: <T>(saga: import("@redux-saga/types").Saga<any[]>, args: {
            instance: T;
            runSaga: any;
        }) => Task<any>;
        channels: import("./utils/interfaces").InternalChannels;
        dispatch: import("redux").Dispatch<import("redux").AnyAction>;
        getState(): any;
        subscribe(listener: () => void): import("redux").Unsubscribe;
        replaceReducer(nextReducer: import("redux").Reducer<any, import("redux").AnyAction>): void;
        [Symbol.observable](): import("redux").Observable<any>;
    };
    /** @internal */
    get emitter(): EventEmitter<EventTypes, any>;
    /** @internal */
    get baseEmitter(): EventEmitter<EventTypes, any>;
    /** @internal */
    private addEventToRegisterQueue;
    /** @internal */
    private _addEventToEmitQueue;
    /**
     * Take into account that `this._eventsNamespace` can be
     * intercepted by a wrapping Proxy object. We use this
     * extensibily for wrapping instances of the BaseConsumer
     * and event handlers instances.
     * @internal
     **/
    private shouldAddToQueue;
    /** @internal */
    private runAndCacheEventHandlerTransform;
    /** @internal */
    private cleanupEventHandlerTransformCache;
    /**
     * Transforms are mapped using the "prefixed" event name (i.e
     * non-namespaced sent by the server with the _eventPrefix) and
     * then mapped again using the end-user `fn` reference.
     * @internal
     */
    private getEmitterListenersMapByInternalEventName;
    private getAndRemoveStableEventHandler;
    /**
     * Creates the event handler to be attached to the `EventEmitter`.
     * It contains the logic for applying any custom transforms for
     * specific events along with the logic for caching the calls to
     * `transform.instanceFactory`
     **/
    private _createStableEventHandler;
    private _parseNestedFields;
    private getOrCreateStableEventHandler;
    /**
     * Since the EventEmitter instance (this.emitter) is
     * shared across the whole app each BaseComponent instance
     * will have to keep track of their own events so if/when
     * the user calls `removeAllListeners` we only clean the
     * events this instance cares/controls.
     */
    private _trackEvent;
    private _untrackEvent;
    private _addListener;
    on<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    _on<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    _once<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    _off<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn?: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    once<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    off<T extends EventEmitter.EventNames<EventTypes>>(event: T, fn?: EventEmitter.EventListener<EventTypes, T>): EventEmitter<EventTypes, any>;
    removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(event?: T): EventEmitter<EventTypes, any>;
    /** @internal */
    eventNames(): EventEmitter.EventNames<EventTypes>[];
    protected getSubscriptions(): EventEmitter.EventNames<EventTypes>[];
    /** @internal */
    emit(event: EventEmitter.EventNames<EventTypes>, ...args: any[]): boolean;
    /** @internal */
    listenerCount<T extends EventEmitter.EventNames<EventTypes>>(event: T): number;
    destroy(): void;
    /** @internal */
    execute<InputType = unknown, OutputType = unknown, ParamsType = Record<string, any>>({ method, params }: ExecuteParams, { transformParams, transformResolve, transformReject, }?: ExecuteExtendedOptions<InputType, OutputType, ParamsType>): Promise<OutputType>;
    /** @internal */
    triggerCustomSaga<T>(action: Action): Promise<T>;
    /** @internal */
    settleCustomSagaTrigger<T>({ dispatchId, payload, kind, }: {
        dispatchId: string;
        payload?: T;
        kind: 'resolve' | 'reject';
    }): void;
    /** @internal */
    select<T>(selectorFn: (state: SDKState) => T): T;
    /** @internal */
    getStateProperty(param: keyof OnlyStateProperties<StateProperties>): any;
    /** @internal */
    private flushEventsRegisterQueue;
    /** @internal */
    private flushEventsEmitQueue;
    /** @internal */
    private flushEventsQueue;
    /** @internal */
    protected _attachListeners(namespace?: string): void;
    /** @internal */
    protected getCompoundEvents(): Map<EventEmitter.EventNames<EventTypes>, EventEmitter.EventNames<EventTypes>[]>;
    /**
     * Returns a structure with the emitter transforms that we want to `apply`
     * for each BaseConsumer. This allow us to define a static structure for
     * each class and later consume it within `applyEmitterTransforms`.
     * @internal
     */
    protected getEmitterTransforms(): Map<string | string[], EventTransform>;
    /** @internal */
    protected get _sessionAuthStatus(): SessionAuthStatus;
    /** @internal */
    protected get _sessionAuthState(): Authorization | undefined;
    /** @internal */
    protected _waitUntilSessionAuthorized(): Promise<this>;
    private _setEmitterTransform;
    /**
     * Loop through the `getEmitterTransforms` Map and translate those into the
     * internal `_emitterTransforms` Map to quickly select & use the transform starting
     * from the server-side event.
     * @internal
     */
    protected applyEmitterTransforms({ local }?: {
        local: boolean;
    }): void;
    /** @internal */
    protected runWorker<Hooks extends SDKWorkerHooks = SDKWorkerHooks>(name: string, def: SDKWorkerDefinition<Hooks>): Task<any>;
    private _setWorker;
    private _attachWorker;
    private detachWorkers;
}
//# sourceMappingURL=BaseComponent.d.ts.map