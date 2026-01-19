import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('LICENSE', () => {
  it('should exist', () => {
    expect(existsSync('LICENSE')).toBe(true);
  });

  it('should be MIT license', () => {
    const license = readFileSync('LICENSE', 'utf-8');
    expect(license).toContain('MIT License');
  });

  it('should have copyright notice', () => {
    const license = readFileSync('LICENSE', 'utf-8');
    expect(license).toMatch(/copyright/i);
  });
});
