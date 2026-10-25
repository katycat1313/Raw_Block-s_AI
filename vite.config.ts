import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/storage': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    plugins: [
      react(),
      {
        name: 'runway-proxy',
        configureServer(server) {
          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (!req.url?.startsWith('/api/runway')) return next();

            const runwayPath = req.url.replace('/api/runway', '') || '/';
            const targetUrl = `https://api.dev.runwayml.com${runwayPath}`;
            const apiKey = env.VITE_RUNWAY_API_KEY;

            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'VITE_RUNWAY_API_KEY not set in .env' }));
              return;
            }

            try {
              const body: string = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
                req.on('end', () => resolve(data));
                req.on('error', reject);
              });

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Runway-Version': '2024-11-06',
              };
              if (req.headers['idempotency-key']) {
                headers['Idempotency-Key'] = req.headers['idempotency-key'] as string;
              }

              const fetchOpts: RequestInit = { method: req.method, headers };
              if (body && req.method !== 'GET' && req.method !== 'HEAD') {
                fetchOpts.body = body;
              }

              const response = await fetch(targetUrl, fetchOpts);
              const responseText = await response.text();

              res.statusCode = response.status;
              res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
              res.end(responseText);
            } catch (err: any) {
              console.error('[Runway Proxy Error]', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      },
      {
        name: 'google-oauth-proxy',
        configureServer(server) {
          server.middlewares.use('/api/auth/token', async (req, res, next) => {
            try {
              // Dynamically find the key file in credentials/
              const fs = await import('fs');
              const path = await import('path');
              const { GoogleAuth } = await import('google-auth-library');

              const credsDir = path.resolve(process.cwd(), 'credentials');

              if (!fs.existsSync(credsDir)) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Credentials directory missing. Please create 'credentials' folder." }));
                return;
              }

              const files = fs.readdirSync(credsDir).filter((f: string) => f.endsWith('.json') && f !== 'placeholder.json');
              if (files.length === 0) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "No JSON key file found in /credentials. Please add your Service Account JSON." }));
                return;
              }

              const keyFile = path.join(credsDir, files[0]);
              console.log(`[Auth Proxy] Using key file: ${files[0]}`);

              const auth = new GoogleAuth({
                keyFile: keyFile,
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
              });

              const client = await auth.getClient();
              const tokenResponse = await client.getAccessToken();
              const projectId = await auth.getProjectId();

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                token: tokenResponse.token,
                projectId: projectId
              }));
            } catch (err: any) {
              console.error("[Auth Proxy Error]", err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
