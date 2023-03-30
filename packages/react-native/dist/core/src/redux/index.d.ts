import { Saga, Task } from '@redux-saga/core';
import { SDKState } from './interfaces';
import { connect } from './connect';
import { InternalUserOptions, SessionConstructor, InternalChannels } from '../utils/interfaces';
export interface ConfigureStoreOptions {
    userOptions: InternalUserOptions;
    SessionConstructor: SessionConstructor;
    runSagaMiddleware?: boolean;
    preloadedState?: Partial<SDKState>;
}
export declare type SDKStore = ReturnType<typeof configureStore>;
export declare type SDKRunSaga = <S extends Saga>(saga: S, params?: Parameters<S>[0]) => Task;
declare const configureStore: (options: ConfigureStoreOptions) => {
    runSaga: <T>(saga: Saga, args: {
        instance: T;
        runSaga: any;
    }) => Task<any>;
    channels: InternalChannels;
    dispatch: import("redux").Dispatch<import("redux").AnyAction>;
    getState(): any;
    subscribe(listener: () => void): import("redux").Unsubscribe;
    replaceReducer(nextReducer: import("redux").Reducer<any, import("redux").AnyAction>): void;
    [Symbol.observable](): import("redux").Observable<any>;
};
export { connect, configureStore };
export * from './actions';
export * from './utils/sagaHelpers';
export * from './toolkit';
//# sourceMappingURL=index.d.ts.map