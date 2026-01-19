import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Static File Serving', () => {
  beforeAll(() => {
    // Ensure build is fresh
    execSync('npm run build', { stdio: 'pipe' });
  });

  describe('Public path resolution', () => {
    it('should have src/public directory', () => {
      const { existsSync } = require('node:fs');
      expect(existsSync('src/public')).toBe(true);
    });

    it('should have index.html in src/public', () => {
      const { existsSync } = require('node:fs');
      expect(existsSync('src/public/index.html')).toBe(true);
    });

    it('should resolve public path correctly from compiled dist', async () => {
      // The compiled app.js needs to find src/public relative to dist/src/app.js
      // When running from dist/src/app.js, __dirname is dist/src
      // So path.join(__dirname, 'public') would be dist/src/public (wrong!)
      // We need path.join(__dirname, '..', '..', 'src', 'public') from dist/src
      
      // Test by importing the compiled module and checking it can serve files
      const { createApp } = await import('../dist/src/app.js');
      const app = await createApp();
      
      const request = (await import('supertest')).default;
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('LLM');
    });

    it('should serve static files like styles.css', async () => {
      const { createApp } = await import('../dist/src/app.js');
      const app = await createApp();
      
      const request = (await import('supertest')).default;
      const response = await request(app).get('/styles.css');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/css');
    });

    it('should serve static files like app.js', async () => {
      const { createApp } = await import('../dist/src/app.js');
      const app = await createApp();
      
      const request = (await import('supertest')).default;
      const response = await request(app).get('/app.js');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('javascript');
    });
  });
});
