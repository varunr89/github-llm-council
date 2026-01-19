import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

describe('CLI Entry Point', () => {
  it('should have executable cli.js in bin/', () => {
    expect(existsSync('bin/cli.js')).toBe(true);
  });

  it('should have shebang line', async () => {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile('bin/cli.js', 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('should start server and print URL', async () => {
    const child = spawn('node', ['bin/cli.js', '--no-open'], {
      env: { ...process.env, PORT: '3099', COPILOT_MOCK: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    await setTimeout(3000);
    child.kill('SIGTERM');

    expect(output).toContain('http://');
    expect(output).toContain('3099');
  }, 10000);

  it('should respect PORT environment variable', async () => {
    const child = spawn('node', ['bin/cli.js', '--no-open'], {
      env: { ...process.env, PORT: '3098', COPILOT_MOCK: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    await setTimeout(3000);
    child.kill('SIGTERM');

    expect(output).toContain('3098');
  }, 10000);
});
