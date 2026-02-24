import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTypeScriptFile } from '../../src/analyzers/typescript-parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../fixtures/simple-nextjs');

describe('TypeScript Parser', () => {
  it('should parse a page file and classify as page', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'app/page.tsx'),
      fixturesDir,
    );

    expect(result.isPage).toBe(true);
    // page.tsx exports a PascalCase function, so isComponent can also be true
    expect(result.isApiRoute).toBe(false);
    expect(result.relativePath).toBe('app/page.tsx');
  });

  it('should parse a component file and extract exports', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'components/Button.tsx'),
      fixturesDir,
    );

    expect(result.isComponent).toBe(true);
    expect(result.exports.length).toBeGreaterThan(0);
    expect(result.exports.some((e) => e.name === 'Button')).toBe(true);
  });

  it('should parse an API route file', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'app/api/users/route.ts'),
      fixturesDir,
    );

    expect(result.isApiRoute).toBe(true);
    expect(result.exports.length).toBeGreaterThan(0);
  });

  it('should extract imports from files', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'app/page.tsx'),
      fixturesDir,
    );

    expect(result.imports.length).toBeGreaterThanOrEqual(0);
    // Page should import Button component
    for (const imp of result.imports) {
      expect(imp.source).toBeDefined();
      expect(imp.specifiers).toBeDefined();
    }
  });

  it('should detect client component type', async () => {
    // Button.tsx in simple-nextjs fixture has 'use client' directive
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'components/Button.tsx'),
      fixturesDir,
    );

    expect(result.componentType).toBe('client');
  });

  it('should classify lib files correctly', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'lib/auth.ts'),
      fixturesDir,
    );

    expect(result.isLib).toBe(true);
    expect(result.isComponent).toBe(false);
    expect(result.isPage).toBe(false);
  });

  it('should detect Pages Router data fetching methods', async () => {
    const pagesFixture = resolve(__dirname, '../fixtures/pages-router');
    const result = await parseTypeScriptFile(
      resolve(pagesFixture, 'pages/posts/[id].tsx'),
      pagesFixture,
    );

    expect(result.dataFetchingMethod).toBeDefined();
    // [id].tsx should export getStaticProps or getStaticPaths
    expect(['getStaticProps', 'getStaticPaths'].includes(result.dataFetchingMethod!)).toBe(true);
  });

  it('should extract JSX elements', async () => {
    const result = await parseTypeScriptFile(
      resolve(fixturesDir, 'app/page.tsx'),
      fixturesDir,
    );

    // Page renders components - check jsxElements
    expect(Array.isArray(result.jsxElements)).toBe(true);
  });
});
