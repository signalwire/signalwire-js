"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTurnServer = exports.SimpleTurnServer = void 0;
exports.createTurnServer = createTurnServer;
exports.waitForServer = waitForServer;
const Turn = require('node-turn');
const crypto_1 = require("crypto");
const http_1 = require("http");

/**
 * Real TURN server implementation using node-turn for testing WebRTC ICE candidate gathering
 * This provides a fully functional TURN/STUN server for integration testing.
 */
class RealTurnServer {
    constructor(config = {}) {
        this.isStarted = false;
        this.config = {
            port: config.port || 3478,
            host: config.host || '127.0.0.1',
            realm: config.realm || 'signalwire-test-realm',
            authMech: 'long-term',
            credentials: config.credentials || {
                testuser: 'testpass',
                user1: 'pass1',
                user2: 'pass2'
            },
            debugLevel: config.debugLevel || 'ERROR',
            ...config
        };
        
        // Configure the node-turn server
        this.server = new Turn({
            authMech: this.config.authMech,
            credentials: this.config.credentials,
            realm: this.config.realm,
            debugLevel: this.config.debugLevel,
            listeningIps: [this.config.host],
            listeningPort: this.config.port,
            relayIps: [this.config.host],
            minPort: 49152,
            maxPort: 65535
        });
    }

    /**
     * Start the TURN server
     */
    async start() {
        if (this.isStarted) {
            console.log('TURN Server already started');
            return;
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.server.start();
                this.isStarted = true;
                console.log(`✓ Real TURN Server started on ${this.config.host}:${this.config.port}`);
                
                // Give the server a moment to fully initialize
                setTimeout(resolve, 100);
            } catch (error) {
                console.error('✗ Failed to start TURN Server:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop the TURN server
     */
    async stop() {
        if (!this.isStarted) {
            return;
        }
        
        return new Promise((resolve) => {
            try {
                this.server.stop();
                console.log('✓ Real TURN Server stopped');
                this.isStarted = false;
                resolve();
            } catch (error) {
                console.error('Error stopping TURN server:', error);
                resolve(); // Resolve anyway to avoid hanging
            }
        });
    }

    /**
     * Get TURN server configuration for WebRTC
     */
    getIceServers() {
        // Get the first credential from the object
        const firstCredential = Object.entries(this.config.credentials)[0];
        const [username, password] = firstCredential || ['testuser', 'testpass'];
        
        return [
            {
                urls: [`turn:${this.config.host}:${this.config.port}?transport=udp`],
                username: username,
                credential: password,
            },
            {
                urls: [`turn:${this.config.host}:${this.config.port}?transport=tcp`],
                username: username,
                credential: password,
            },
            {
                urls: [`stun:${this.config.host}:${this.config.port}`],
            },
        ];
    }

    /**
     * Generate time-limited TURN credentials
     */
    generateCredentials(ttl = 3600) {
        const timestamp = Math.floor(Date.now() / 1000) + ttl;
        const username = `${timestamp}:testuser`;
        const secret = 'test-secret';
        const hmac = (0, crypto_1.createHmac)('sha1', secret);
        hmac.update(username);
        const password = hmac.digest('base64');
        
        return {
            username,
            password,
        };
    }

    /**
     * Get server configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if server is running
     */
    isRunning() {
        return this.isStarted;
    }
}
exports.RealTurnServer = RealTurnServer;

/**
 * Simple TURN server implementation for backward compatibility
 * This wraps the real TURN server with the SimpleTurnServer interface
 */
class SimpleTurnServer extends RealTurnServer {
    constructor(config = {}) {
        super(config);
    }
}
exports.SimpleTurnServer = SimpleTurnServer;

/**
 * Factory function to create and manage TURN server instances
 */
function createTurnServer(config) {
    return new RealTurnServer(config);
}

/**
 * Utility function to wait for server to be ready
 */
async function waitForServer(host, port, timeout = 10000) {
    const start = Date.now();
    
    // Wait a bit for the server to start up
    await new Promise(resolve => setTimeout(resolve, 500));
    
    while (Date.now() - start < timeout) {
        try {
            // For TURN servers, we can't easily check with HTTP
            // Instead, we'll assume it's ready after a short delay
            // since node-turn starts synchronously
            return true;
        }
        catch (error) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return true; // Assume it's ready
}

exports.default = RealTurnServer;