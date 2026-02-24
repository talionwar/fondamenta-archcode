import { describe, it, expect } from 'vitest';
import { impactAnalyzerAgent } from '../../../src/agents/pro/impact-analyzer.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockComponent } from '../../helpers.js';

describe('Impact Analyzer Agent', () => {
  it('should flag high fan-in node (many dependents)', () => {
    const graph = createMockGraph({
      edges: Array.from({ length: 15 }, (_, i) => ({
        from: `file${i}.ts`,
        to: 'lib/common.ts',
        type: 'imports',
      })),
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const highFanIn = findings.find(
      (f) => f.title === 'High-impact file (fan-in)' && f.filePath === 'lib/common.ts',
    );

    expect(highFanIn).toBeDefined();
    expect(highFanIn?.severity).toBe('info');
    expect(highFanIn?.message).toContain('15 files depend');
  });

  it('should flag high fan-out node (many dependencies)', () => {
    const graph = createMockGraph({
      edges: Array.from({ length: 20 }, (_, i) => ({
        from: 'lib/orchestrator.ts',
        to: `lib/service${i}.ts`,
        type: 'imports',
      })),
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const highFanOut = findings.find(
      (f) => f.title === 'High coupling (fan-out)' && f.filePath === 'lib/orchestrator.ts',
    );

    expect(highFanOut).toBeDefined();
    expect(highFanOut?.severity).toBe('info');
    expect(highFanOut?.message).toContain('20');
  });

  it('should flag hub component (high usedBy + high renders)', () => {
    const usedByCount = 8;
    const rendersCount = 10;

    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/HubComponent.tsx',
          name: 'HubComponent',
          usedBy: Array.from({ length: usedByCount }, (_, i) => `file${i}.tsx`),
          renders: Array.from({ length: rendersCount }, (_, i) => `ChildComponent${i}`),
        }),
      ],
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const hub = findings.find((f) => f.title === 'Hub component');

    expect(hub).toBeDefined();
    expect(hub?.severity).toBe('warning');
    expect(hub?.message).toContain('used by 8');
    expect(hub?.message).toContain('renders 10');
  });

  it('should NOT flag component with low usedBy even if high renders', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/ManyChildren.tsx',
          name: 'ManyChildren',
          usedBy: ['app/page.tsx'],
          renders: Array.from({ length: 20 }, (_, i) => `Child${i}`),
        }),
      ],
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const hub = findings.find((f) => f.title === 'Hub component');

    expect(hub).toBeUndefined();
  });

  it('should NOT flag node below thresholds', () => {
    const graph = createMockGraph({
      edges: Array.from({ length: 3 }, (_, i) => ({
        from: `file${i}.ts`,
        to: 'lib/util.ts',
        type: 'imports',
      })),
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should flag bridge file (high fan-in and high fan-out)', () => {
    const graph = createMockGraph({
      edges: [
        // Incoming edges (fan-in = 6)
        ...Array.from({ length: 6 }, (_, i) => ({
          from: `consumer${i}.ts`,
          to: 'lib/bridge.ts',
          type: 'imports',
        })),
        // Outgoing edges (fan-out = 6)
        ...Array.from({ length: 6 }, (_, i) => ({
          from: 'lib/bridge.ts',
          to: `provider${i}.ts`,
          type: 'imports',
        })),
      ],
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const bridge = findings.find((f) => f.title === 'Bridge file' && f.filePath === 'lib/bridge.ts');

    expect(bridge).toBeDefined();
    expect(bridge?.severity).toBe('info');
    expect(bridge?.message).toContain('6 dependents');
    expect(bridge?.message).toContain('6 dependencies');
  });

  it('should skip .d.ts type definition files from fan-in analysis', () => {
    const graph = createMockGraph({
      edges: Array.from({ length: 15 }, (_, i) => ({
        from: `file${i}.ts`,
        to: 'lib/types.d.ts',
        type: 'imports',
      })),
    });

    const findings = impactAnalyzerAgent.run(graph, DEFAULT_CONFIG);
    const typesFinding = findings.find((f) => f.filePath === 'lib/types.d.ts');

    expect(typesFinding).toBeUndefined();
  });
});
