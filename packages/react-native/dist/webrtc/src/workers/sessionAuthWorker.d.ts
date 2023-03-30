import { SDKWorker, SDKWorkerHooks } from '@signalwire/core';
import { BaseConnection } from '../BaseConnection';
declare type SessionAuthWorkerOnDone = (args: BaseConnection<any>) => void;
declare type SessionAuthWorkerOnFail = (args: {
    error: Error;
}) => void;
export declare type SessionAuthWorkerHooks = SDKWorkerHooks<SessionAuthWorkerOnDone, SessionAuthWorkerOnFail>;
export declare const sessionAuthWorker: SDKWorker<BaseConnection<any>, SessionAuthWorkerHooks>;
export {};
//# sourceMappingURL=sessionAuthWorker.d.ts.map