import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
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
