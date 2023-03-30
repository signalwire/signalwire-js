export declare const RPCPing: () => {
    id: string;
    method: import("..").JSONRPCMethod;
    params: {
        [key: string]: any;
    };
    jsonrpc: "2.0";
};
export declare const RPCPingResponse: (id: string, timestamp?: number) => {
    id: string;
    result: {
        [key: string]: any;
    };
    jsonrpc: "2.0";
};
//# sourceMappingURL=RPCPing.d.ts.map