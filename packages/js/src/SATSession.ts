import { SessionOptions } from "@signalwire/core";
import { JWTSession } from "./JWTSession";

export class SATSession extends JWTSession {
    constructor(public options: SessionOptions) {
        super(options)
    }

    get isReconnecting () {
        return !!this._rpcConnectResult
    }

    override async retrieveRelayProtocol() {
        // FIXME: until we get the "reattach" working for CF, we should only hijack the protocol in a "reconnect"
        return this.isReconnecting ? super.retrieveRelayProtocol() : ''
    }

}