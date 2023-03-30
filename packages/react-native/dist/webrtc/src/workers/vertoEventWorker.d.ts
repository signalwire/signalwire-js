import { SDKWorker, SDKWorkerHooks } from '@signalwire/core';
import { BaseConnection } from '../BaseConnection';
declare type VertoEventWorkerOnDone = (args: BaseConnection<any>) => void;
declare type VertoEventWorkerOnFail = (args: {
    error: Error;
}) => void;
export declare type VertoEventWorkerHooks = SDKWorkerHooks<VertoEventWorkerOnDone, VertoEventWorkerOnFail>;
export declare const vertoEventWorker: SDKWorker<BaseConnection<any>, VertoEventWorkerHooks>;
export {};
//# sourceMappingURL=vertoEventWorker.d.ts.map