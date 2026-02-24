import { describe, it, expect } from 'vitest';
import { securityScannerAgent } from '../../../src/agents/pro/security-scanner.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockApiRoute } from '../../helpers.js';

describe('Security Scanner Agent', () => {
  it('should flag unauthenticated DB access in API route', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/admin/users/route.ts',
          routePath: '/api/admin/users',
          methods: ['GET'],
          auth: 'None',
          models: ['User', 'Profile'],
        }),
      ],
    });

    const findings = securityScannerAgent.run(graph, DEFAULT_CONFIG);
    const dbAccess = findings.find((f) => f.title === 'Unauthenticated DB access');

    expect(dbAccess).toBeDefined();
    expect(dbAccess?.severity).toBe('error');
    expect(dbAccess?.message).toContain('without any auth');
  });

  it('should NOT flag authenticated routes with DB access', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/admin/users/route.ts',
          routePath: '/api/admin/users',
          methods: ['GET'],
          auth: 'auth()',
          models: ['User'],
        }),
      ],
    });

    const findings = securityScannerAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag routes without DB models', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/health/route.ts',
          routePath: '/api/health',
          methods: ['GET'],
          auth: 'None',
          models: [],
        }),
      ],
    });

    const findings = securityScannerAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should flag shell execution imports', () => {
    const graph = createMockGraph({
      nodes: [
        [
          'lib/process-utils.ts',
          {
            id: 'lib/process-utils.ts',
            type: 'lib',
            filePath: 'lib/process-utils.ts',
            metadata: {
              name: 'processUtils',
              exports: [],
              imports: [
                {
                  source: 'child_process',
                  specifiers: ['exec'],
                  isTypeOnly: false,
                },
              ],
            },
          },
        ],
      ],
      libs: [
        {
          filePath: 'lib/process-utils.ts',
          exports: [],
          imports: [
            {
              source: 'child_process',
              specifiers: ['exec'],
              isTypeOnly: false,
            },
          ],
          usedBy: ['app/api/route.ts'],
          sideEffects: [],
          envVars: [],
        },
      ],
    });

    const findings = securityScannerAgent.run(graph, DEFAULT_CONFIG);
    const shellExec = findings.find((f) => f.title === 'Shell execution import');

    expect(shellExec).toBeDefined();
    expect(shellExec?.severity).toBe('warning');
  });
});
