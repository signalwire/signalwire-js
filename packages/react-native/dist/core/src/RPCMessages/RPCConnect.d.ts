declare type WithToken = {
    token: string;
    jwt_token?: never;
};
declare type WithJWT = {
    token?: never;
    jwt_token: string;
};
declare type RPCConnectAuthentication = {
    project?: string;
} & (WithToken | WithJWT);
export declare type RPCConnectParams = {
    authentication: RPCConnectAuthentication;
    version?: typeof DEFAULT_CONNECT_VERSION;
    agent?: string;
    protocol?: string;
    authorization_state?: string;
    contexts?: string[];
};
export declare const DEFAULT_CONNECT_VERSION: {
    major: number;
    minor: number;
    revision: number;
};
export declare const RPCConnect: (params: RPCConnectParams) => {
    id: string;
    method: import("..").JSONRPCMethod;
    params: {
        [key: string]: any;
    };
    jsonrpc: "2.0";
};
export {};
//# sourceMappingURL=RPCConnect.d.ts.map