import { describe, it, expect } from 'vitest';
import { conventionEnforcerAgent } from '../../../src/agents/pro/convention-enforcer.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockApiRoute } from '../../helpers.js';

describe('Convention Enforcer Agent', () => {
  it('should flag inconsistent auth patterns across routes', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          auth: 'auth()',
        }),
        createMockApiRoute({
          filePath: 'app/api/posts/route.ts',
          routePath: '/api/posts',
          auth: 'getServerSession',
        }),
        createMockApiRoute({
          filePath: 'app/api/comments/route.ts',
          routePath: '/api/comments',
          auth: 'auth()',
        }),
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const inconsistent = findings.find((f) => f.title === 'Inconsistent auth patterns');

    expect(inconsistent).toBeDefined();
    expect(inconsistent?.severity).toBe('warning');
    expect(inconsistent?.message).toContain('Multiple auth patterns');
  });

  it('should NOT flag consistent auth patterns', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          auth: 'auth()',
        }),
        createMockApiRoute({
          filePath: 'app/api/posts/route.ts',
          routePath: '/api/posts',
          auth: 'auth()',
        }),
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const inconsistent = findings.find((f) => f.title === 'Inconsistent auth patterns');

    expect(inconsistent).toBeUndefined();
  });

  it('should flag non-kebab-case route segments', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/getUserProfile/route.ts',
          routePath: '/api/getUserProfile',
          auth: 'auth()',
        }),
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const nonKebab = findings.find((f) => f.title === 'Non-kebab-case route');

    expect(nonKebab).toBeDefined();
    expect(nonKebab?.severity).toBe('info');
  });

  it('should allow dynamic segments in routes', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/[id]/route.ts',
          routePath: '/api/users/[id]',
          auth: 'auth()',
        }),
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const nonKebab = findings.find((f) => f.title === 'Non-kebab-case route');

    expect(nonKebab).toBeUndefined();
  });

  it('should flag missing barrel exports in directories with >3 files', () => {
    const graph = createMockGraph({
      nodes: [
        ['lib/utils/a.ts', { id: 'lib/utils/a.ts', type: 'lib', filePath: 'lib/utils/a.ts', metadata: { name: 'a', exports: [], imports: [] } }],
        ['lib/utils/b.ts', { id: 'lib/utils/b.ts', type: 'lib', filePath: 'lib/utils/b.ts', metadata: { name: 'b', exports: [], imports: [] } }],
        ['lib/utils/c.ts', { id: 'lib/utils/c.ts', type: 'lib', filePath: 'lib/utils/c.ts', metadata: { name: 'c', exports: [], imports: [] } }],
        ['lib/utils/d.ts', { id: 'lib/utils/d.ts', type: 'lib', filePath: 'lib/utils/d.ts', metadata: { name: 'd', exports: [], imports: [] } }],
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const missingBarrel = findings.find((f) => f.title === 'Missing barrel export');

    expect(missingBarrel).toBeDefined();
    expect(missingBarrel?.message).toContain('4 files');
  });

  it('should NOT flag barrel export if index exists', () => {
    const graph = createMockGraph({
      nodes: [
        ['lib/utils/a.ts', { id: 'lib/utils/a.ts', type: 'lib', filePath: 'lib/utils/a.ts', metadata: { name: 'a', exports: [], imports: [] } }],
        ['lib/utils/b.ts', { id: 'lib/utils/b.ts', type: 'lib', filePath: 'lib/utils/b.ts', metadata: { name: 'b', exports: [], imports: [] } }],
        ['lib/utils/c.ts', { id: 'lib/utils/c.ts', type: 'lib', filePath: 'lib/utils/c.ts', metadata: { name: 'c', exports: [], imports: [] } }],
        ['lib/utils/d.ts', { id: 'lib/utils/d.ts', type: 'lib', filePath: 'lib/utils/d.ts', metadata: { name: 'd', exports: [], imports: [] } }],
        ['lib/utils/index.ts', { id: 'lib/utils/index.ts', type: 'lib', filePath: 'lib/utils/index.ts', metadata: { name: 'index', exports: [], imports: [] } }],
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const missingBarrel = findings.find((f) => f.title === 'Missing barrel export');

    expect(missingBarrel).toBeUndefined();
  });

  it('should NOT flag app/ directories for barrel exports', () => {
    const graph = createMockGraph({
      nodes: [
        ['app/items/a.tsx', { id: 'app/items/a.tsx', type: 'page', filePath: 'app/items/a.tsx', metadata: { name: 'a', exports: [], imports: [] } }],
        ['app/items/b.tsx', { id: 'app/items/b.tsx', type: 'page', filePath: 'app/items/b.tsx', metadata: { name: 'b', exports: [], imports: [] } }],
        ['app/items/c.tsx', { id: 'app/items/c.tsx', type: 'page', filePath: 'app/items/c.tsx', metadata: { name: 'c', exports: [], imports: [] } }],
        ['app/items/d.tsx', { id: 'app/items/d.tsx', type: 'page', filePath: 'app/items/d.tsx', metadata: { name: 'd', exports: [], imports: [] } }],
      ],
    });

    const findings = conventionEnforcerAgent.run(graph, DEFAULT_CONFIG);
    const missingBarrel = findings.find((f) => f.title === 'Missing barrel export');

    expect(missingBarrel).toBeUndefined();
  });
});
