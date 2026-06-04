import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load env vars from the root .env file.
 * Used for:
 * - Injecting build-time config into the client bundle (define)
 * - Server-side middleware that proxies subscriber token requests
 */
function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    return Object.fromEntries(
      content
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => {
          const eqIndex = line.indexOf('=');
          if (eqIndex === -1) return null;
          const key = line.substring(0, eqIndex).trim();
          const value = line
            .substring(eqIndex + 1)
            .trim()
            .replace(/^"(.*)"$|^'(.*)'$/, '$1$2');
          return [key, value];
        })
        .filter(Boolean)
    );
  } catch {
    return {};
  }
}

const rootEnv = loadEnvFile(resolve(__dirname, '../../.env'));

const MAX_BODY_SIZE = 4096;

/** Read request body with a size limit to prevent DoS */
function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request body too large' }));
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default defineConfig({
  define: {
    // Build-time SAT token (optional, set via env var from issue-sat.js)
    SAT_TOKEN: JSON.stringify(process.env.SAT_TOKEN || null),
  },
  server: {
    port: 3001,
    open: true,
  },
  preview: {
    port: 4174,
  },
  plugins: [
    {
      name: 'auth-api-middleware',
      configureServer(server) {
        // --------------------------------------------------------
        // POST /api/subscriber/token
        //
        // Proxies subscriber token requests to SignalWire API.
        // This is the v4 equivalent of the original Express /subscriber route.
        //
        // Original: POST /subscriber → server calls SignalWire API with Basic auth
        // v4 demo:  POST /api/subscriber/token → Vite middleware does the same
        // --------------------------------------------------------
        server.middlewares.use('/api/subscriber/token', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const body = await readBody(req, res);
            const { reference, password, fingerprint } = JSON.parse(body);

            const space = rootEnv.SW_SPACE;
            const domain = rootEnv.SW_DOMAIN || 'signalwire.com';
            const projectId = rootEnv.SW_PROJECT_ID;
            const apiToken = rootEnv.SW_API_TOKEN;
            const applicationId = rootEnv.SW_APPLICATION_ID;

            if (!space || !projectId || !apiToken) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'Server not configured. Set SW_SPACE, SW_PROJECT_ID, SW_API_TOKEN in root .env',
                })
              );
              return;
            }

            const url = `https://${space}.${domain}/api/fabric/subscribers/tokens`;
            const auth = Buffer.from(`${projectId}:${apiToken}`).toString(
              'base64'
            );

            const tokenResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Basic ${auth}`,
              },
              body: JSON.stringify({
                application_id: applicationId,
                reference,
                password,
                // DPoP: when fingerprint is present, request a Client Bound SAT
                ...(fingerprint && { fingerprint, scope: 'sat:refresh' }),
              }),
            });

            if (!tokenResponse.ok) {
              const errorText = await tokenResponse.text();
              res.statusCode = tokenResponse.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: errorText }));
              return;
            }

            const data = await tokenResponse.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (error) {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          }
        });

      },
    },
  ],
});
