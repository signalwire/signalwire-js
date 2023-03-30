import { SDKWorker, SDKWorkerHooks } from '@signalwire/core';
import { BaseConnection } from '../BaseConnection';
declare type RoomSubscribedWorkerOnDone = (args: BaseConnection<any>) => void;
declare type RoomSubscribedWorkerOnFail = (args: {
    error: Error;
}) => void;
export declare type RoomSubscribedWorkerHooks = SDKWorkerHooks<RoomSubscribedWorkerOnDone, RoomSubscribedWorkerOnFail>;
export declare const roomSubscribedWorker: SDKWorker<BaseConnection<any>, RoomSubscribedWorkerHooks>;
export {};
//# sourceMappingURL=roomSubscribedWorker.d.ts.map