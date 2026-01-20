import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

describe('Package Configuration', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

  describe('package.json', () => {
    it('should have correct name', () => {
      expect(pkg.name).toBe('github-llm-council');
    });

    it('should have correct version', () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have description', () => {
      expect(pkg.description).toBeTruthy();
      expect(pkg.description.length).toBeGreaterThan(20);
    });

    it('should have bin entry', () => {
      expect(pkg.bin).toBeDefined();
      expect(pkg.bin['github-llm-council']).toBe('./bin/cli.js');
    });

    it('should have main entry pointing to compiled server', () => {
      expect(pkg.main).toBe('dist/src/server.js');
    });

    it('should have files array with dist, bin, and src/public', () => {
      expect(pkg.files).toContain('dist');
      expect(pkg.files).toContain('bin');
      expect(pkg.files).toContain('src/public');
    });

    it('should have engines specifying node >= 18', () => {
      expect(pkg.engines).toBeDefined();
      expect(pkg.engines.node).toMatch(/>=\s*18/);
    });

    it('should have prepublishOnly script', () => {
      expect(pkg.scripts.prepublishOnly).toBe('npm run build');
    });

    it('should have repository, bugs, and homepage', () => {
      expect(pkg.repository).toBeDefined();
      expect(pkg.bugs).toBeDefined();
      expect(pkg.homepage).toBeDefined();
    });

    it('should have keywords', () => {
      expect(Array.isArray(pkg.keywords)).toBe(true);
      expect(pkg.keywords.length).toBeGreaterThan(0);
    });

    it('should have author', () => {
      expect(pkg.author).toBeTruthy();
    });

    it('should have license MIT', () => {
      expect(pkg.license).toBe('MIT');
    });
  });

  describe('.npmignore', () => {
    it('should exist', () => {
      expect(existsSync('.npmignore')).toBe(true);
    });

    it('should exclude test files', () => {
      const npmignore = readFileSync('.npmignore', 'utf-8');
      expect(npmignore).toContain('tests/');
    });

    it('should exclude config files', () => {
      const npmignore = readFileSync('.npmignore', 'utf-8');
      expect(npmignore).toContain('tsconfig.json');
      expect(npmignore).toContain('vitest.config.ts');
      expect(npmignore).toContain('playwright.config.ts');
    });
  });

  describe('npm pack', () => {
    it('should include only expected files', () => {
      const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
      
      // Should include
      expect(output).toContain('dist/');
      expect(output).toContain('bin/cli.js');
      expect(output).toContain('src/public/');
      expect(output).toContain('package.json');
      
      // Should NOT include
      expect(output).not.toContain('tests/');
      expect(output).not.toContain('vitest.config.ts');
      expect(output).not.toContain('tsconfig.json');
    });
  });
});
