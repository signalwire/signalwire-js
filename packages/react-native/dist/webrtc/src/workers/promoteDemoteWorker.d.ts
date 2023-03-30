import { SDKWorker, SDKWorkerHooks } from '@signalwire/core';
import { BaseConnection } from '../BaseConnection';
declare type PromoteDemoteWorkerOnDone = (args: BaseConnection<any>) => void;
declare type PromoteDemoteWorkerOnFail = (args: {
    error: Error;
}) => void;
export declare type PromoteDemoteWorkerHooks = SDKWorkerHooks<PromoteDemoteWorkerOnDone, PromoteDemoteWorkerOnFail>;
export declare const promoteDemoteWorker: SDKWorker<BaseConnection<any>, PromoteDemoteWorkerHooks>;
export {};
//# sourceMappingURL=promoteDemoteWorker.d.ts.map