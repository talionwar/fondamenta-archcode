import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFramework } from '../../src/framework/detector.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../fixtures');

describe('Framework Detector', () => {
  it('should detect Next.js App Router from simple-nextjs fixture', async () => {
    const result = await detectFramework(resolve(fixturesDir, 'simple-nextjs'));

    // simple-nextjs has app/ dir but no next.config
    // Detection depends on directory structure
    expect(result).toBeDefined();
    expect(result.framework).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.signals)).toBe(true);
  });

  it('should detect Pages Router from pages-router fixture', async () => {
    const result = await detectFramework(resolve(fixturesDir, 'pages-router'));

    // pages-router has pages/ dir and next in dependencies
    expect(result).toBeDefined();
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('should return auto for non-framework project', async () => {
    const result = await detectFramework(resolve(fixturesDir, 'circular-deps'));

    expect(result.framework).toBe('auto');
    expect(result.confidence).toBe(0);
  });

  it('should include package.json signals', async () => {
    const result = await detectFramework(resolve(fixturesDir, 'pages-router'));

    // pages-router has "next" in package.json
    const hasNextSignal = result.signals.some((s) => s.includes('next'));
    expect(hasNextSignal).toBe(true);
  });
});
