import { MapToPubSubShape } from '../redux/interfaces';
export declare const toInternalAction: <T extends {
    event_type: string;
    params?: unknown;
    node_id?: string | undefined;
}>(event: T) => MapToPubSubShape<T>;
//# sourceMappingURL=toInternalAction.d.ts.map