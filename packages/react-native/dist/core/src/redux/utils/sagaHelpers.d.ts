import { Saga } from '@redux-saga/core';
export declare const createRestartableSaga: (saga: Saga) => () => Generator<never, void, unknown>;
export declare const createCatchableSaga: <Args = any>(saga: Saga, errorHandler?: (error: any) => void) => (...params: Args[]) => Generator<import("@redux-saga/core/effects").CallEffect<any>, void, unknown>;
export { eventChannel } from '@redux-saga/core';
//# sourceMappingURL=sagaHelpers.d.ts.map