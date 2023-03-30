/// <reference types="jest" />
import { ConfigureStoreOptions } from './redux';
import { PubSubChannel, SwEventChannel, SessionChannel } from './redux/interfaces';
import { RPCConnectResult, InternalSDKLogger } from './utils/interfaces';
import { EventEmitter } from './utils/EventEmitter';
export declare const createMockedLogger: () => InternalSDKLogger;
/**
 * Helper method to configure a Store w/o Saga middleware.
 * Useful to test slices and reducers logic.
 *
 * @returns Redux Store
 */
export declare const configureJestStore: (options?: Partial<ConfigureStoreOptions>) => {
    runSaga: <T>(saga: import("@redux-saga/types").Saga<any[]>, args: {
        instance: T;
        runSaga: any;
    }) => import("@redux-saga/types").Task<any>;
    channels: import(".").InternalChannels;
    dispatch: import("redux").Dispatch<import("redux").AnyAction>;
    getState(): any;
    subscribe(listener: () => void): import("redux").Unsubscribe;
    replaceReducer(nextReducer: import("redux").Reducer<any, import("redux").AnyAction>): void;
    [Symbol.observable](): import("redux").Observable<any>;
};
/**
 * Helper method to configure a Store with a rootSaga
 * and a mocked Session object.
 * This allow to write integration tests.
 *
 * @returns { store, session, emitter, destroy }
 */
export declare const configureFullStack: () => {
    store: {
        runSaga: <T>(saga: import("@redux-saga/types").Saga<any[]>, args: {
            instance: T;
            runSaga: any;
        }) => import("@redux-saga/types").Task<any>;
        channels: import(".").InternalChannels;
        dispatch: import("redux").Dispatch<import("redux").AnyAction>;
        getState(): any;
        subscribe(listener: () => void): import("redux").Unsubscribe;
        replaceReducer(nextReducer: import("redux").Reducer<any, import("redux").AnyAction>): void;
        [Symbol.observable](): import("redux").Observable<any>;
    };
    session: {
        dispatch: {
            (...data: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
        connect: jest.Mock<any, any>;
        disconnect: jest.Mock<any, any>;
        execute: jest.Mock<any, any>;
    };
    emitter: EventEmitter<string | symbol, any>;
    destroy: () => {
        payload: undefined;
        type: "swSdk/destroy";
    };
};
export declare const wait: (ms: number) => Promise<unknown>;
export declare const rpcConnectResultVRT: RPCConnectResult;
export declare const createPubSubChannel: () => PubSubChannel;
export declare const createSwEventChannel: () => SwEventChannel;
export declare const createSessionChannel: () => SessionChannel;
//# sourceMappingURL=testUtils.d.ts.map