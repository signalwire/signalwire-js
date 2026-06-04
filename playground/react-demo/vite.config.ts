import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mainPkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../packages/main/package.json'), 'utf-8')
);

/**
 * Load env vars from a .env file.
 * Used for subscriber token proxy middleware.
 */
function loadEnvFile(path: string): Record<string, string> {
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
        .filter(Boolean) as [string, string][]
    );
  } catch {
    return {};
  }
}

const rootEnv = loadEnvFile(resolve(__dirname, '../../.env'));

const MAX_BODY_SIZE = 4096;

/** Read request body with a size limit */
function readBody(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse
): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
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
  resolve: {
    alias: {
      // Point to source so the react demo always sees the latest types and
      // components without requiring a dist rebuild during development.
      '@signalwire/web-components': resolve(__dirname, '../../packages/web-components/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Exclude so esbuild's pre-bundle scanner never touches the Lit/TS decorator
    // syntax in the web-components source — Vite's Rollup pipeline handles it fine.
    exclude: ['@signalwire/web-components'],
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'auth-api-middleware',
      configureServer(server) {
        // POST /api/subscriber/token — Proxy subscriber auth to SignalWire API
        server.middlewares.use('/api/subscriber/token', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const body = await readBody(req, res);
            const { reference, password, expire_at, fingerprint } = JSON.parse(body);

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
            const auth = Buffer.from(`${projectId}:${apiToken}`).toString('base64');

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
                expire_at,
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
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                })
              );
            }
          }
        });

      },
    },
  ],
  define: {
    SAT_TOKEN: JSON.stringify(process.env.SAT_TOKEN || null),
    __VERSION__: JSON.stringify(mainPkg.version),
  },
  server: {
    port: 3002,
    open: true,
  },
  preview: {
    port: 4175,
  },
});
