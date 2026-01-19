import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('README.md', () => {
  it('should exist', () => {
    expect(existsSync('README.md')).toBe(true);
  });

  const readme = existsSync('README.md') ? readFileSync('README.md', 'utf-8') : '';

  it('should have title', () => {
    expect(readme).toContain('# LLM Council');
  });

  it('should have quick start section', () => {
    expect(readme.toLowerCase()).toContain('quick start');
  });

  it('should mention npx command', () => {
    expect(readme).toContain('npx github-llm-council');
  });

  it('should mention Copilot CLI prerequisite', () => {
    expect(readme.toLowerCase()).toContain('copilot');
    expect(readme).toMatch(/copilot.*auth|auth.*copilot/i);
  });

  it('should mention Node.js 18+ requirement', () => {
    expect(readme).toMatch(/node.*18|18.*node/i);
  });

  it('should have development section', () => {
    expect(readme.toLowerCase()).toContain('development');
    expect(readme).toContain('npm install');
    expect(readme).toContain('npm run dev');
  });

  it('should have license section', () => {
    expect(readme.toLowerCase()).toContain('license');
    expect(readme).toContain('MIT');
  });
});
