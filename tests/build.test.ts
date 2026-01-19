import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

describe('TypeScript Build', () => {
  beforeAll(() => {
    // Build once before all tests
    execSync('npm run build', { stdio: 'pipe' });
  });

  it('should produce dist/src/server.js', () => {
    expect(existsSync('dist/src/server.js')).toBe(true);
  });

  it('should produce declaration files', () => {
    expect(existsSync('dist/src/server.d.ts')).toBe(true);
  });

  it('should produce source maps', () => {
    expect(existsSync('dist/src/server.js.map')).toBe(true);
  });
});
