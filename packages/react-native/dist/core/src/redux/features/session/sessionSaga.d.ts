import { SagaIterator } from '@redux-saga/core';
import { BaseSession } from '../../../BaseSession';
import type { PubSubChannel, SessionChannel, SwEventChannel } from '../../interfaces';
declare type SessionSagaParams = {
    session: BaseSession;
    sessionChannel: SessionChannel;
    pubSubChannel: PubSubChannel;
    swEventChannel: SwEventChannel;
};
export declare function sessionChannelWatcher({ sessionChannel, pubSubChannel, swEventChannel, session, }: SessionSagaParams): SagaIterator;
export {};
//# sourceMappingURL=sessionSaga.d.ts.map