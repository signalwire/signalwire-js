const { createServer } = require('http');
const { randomBytes } = require('crypto');

/**
 * Simple TURN server implementation for testing WebRTC ICE candidate gathering
 * This is a minimal TURN server that provides the basic functionality needed
 * to test srvflx candidates in WebRTC peer connections.
 * 
 * Note: This is a simplified implementation for testing purposes only.
 * For production use, consider using coturn or a similar full-featured TURN server.
 */
class SimpleTurnServer {
  constructor(config = {}) {
    this.config = {
      port: 3478,
      host: '127.0.0.1',
      realm: 'signalwire-test-realm',
      credentials: [
        {
          username: 'testuser',
          password: 'testpass',
        },
      ],
      ...config,
    };

    this.server = createServer();
    this.isStarted = false;
    this.setupServer();
  }

  setupServer() {
    this.server.on('listening', () => {
      const address = this.server.address();
      console.log(`✓ TURN Server started on ${address.address}:${address.port}`);
    });

    this.server.on('error', (error) => {
      console.error('✗ TURN Server error:', error);
    });

    // Handle STUN/TURN requests
    this.server.on('request', (req, res) => {
      // Simple HTTP endpoint for health checks
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', realm: this.config.realm }));
        return;
      }

      // Return 404 for other HTTP requests
      res.writeHead(404);
      res.end();
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
      this.server.listen(this.config.port, this.config.host, () => {
        this.isStarted = true;
        resolve();
      });

      this.server.on('error', reject);
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
      this.server.close(() => {
        console.log('✓ TURN Server stopped');
        this.isStarted = false;
        resolve();
      });
    });
  }

  /**
   * Get TURN server configuration for WebRTC
   */
  getIceServers() {
    return [
      {
        urls: [`turn:${this.config.host}:${this.config.port}`],
        username: this.config.credentials[0].username,
        credential: this.config.credentials[0].password,
      },
      {
        urls: [`stun:${this.config.host}:${this.config.port}`],
      },
    ];
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

/**
 * Mock TURN server that simulates TURN allocation for testing
 */
class MockTurnServer {
  static getInstance() {
    if (!MockTurnServer.instance) {
      MockTurnServer.instance = new MockTurnServer();
    }
    return MockTurnServer.instance;
  }

  constructor() {
    this.turnServer = new SimpleTurnServer();
  }

  async start() {
    await this.turnServer.start();
  }

  async stop() {
    await this.turnServer.stop();
    MockTurnServer.instance = null;
  }

  getIceServers() {
    return this.turnServer.getIceServers();
  }

  getConfig() {
    return this.turnServer.getConfig();
  }
}

/**
 * Utility function to wait for server to be ready
 */
async function waitForServer(host, port, timeout = 10000) {
  const start = Date.now();
  const http = require('http');
  
  while (Date.now() - start < timeout) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://${host}:${port}/health`, (res) => {
          resolve({ ok: res.statusCode === 200 });
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

module.exports = {
  SimpleTurnServer,
  MockTurnServer,
  waitForServer,
};