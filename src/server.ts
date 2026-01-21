import net from 'node:net';
import { createApp } from './app.js';

// Check if a port is available (Vite-style native implementation)
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

// Find an available port starting from the given port
async function findAvailablePort(startPort: number, host: string): Promise<number> {
  const maxPort = Math.min(startPort + 100, 65535); // Try up to 100 ports
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

const app = await createApp();

const preferredPort = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const port = await findAvailablePort(preferredPort, host);
if (port !== preferredPort) {
  console.log(`Port ${preferredPort} is in use, using ${port} instead`);
}

app.listen(port, host, () => {
  // This exact format is parsed by cli.js to extract the port
  console.log(`LLM Council running at http://localhost:${port}`);
});
