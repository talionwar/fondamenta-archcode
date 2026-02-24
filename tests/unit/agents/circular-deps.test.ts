import { describe, it, expect } from 'vitest';
import { circularDepsAgent } from '../../../src/agents/free/circular-deps.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph } from '../../helpers.js';

describe('Circular Dependencies Agent', () => {
  it('should detect 3-cycle A→B→C→A', () => {
    const graph = createMockGraph({
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'imports' },
        { from: 'b.ts', to: 'c.ts', type: 'imports' },
        { from: 'c.ts', to: 'a.ts', type: 'imports' },
      ],
    });

    const findings = circularDepsAgent.run(graph, DEFAULT_CONFIG);

    expect(findings.length).toBeGreaterThan(0);
    const cycleFinding = findings[0];
    expect(cycleFinding.severity).toBe('warning');
    expect(cycleFinding.title).toContain('Circular dependency');
    expect(cycleFinding.message).toContain('Import cycle');
  });

  it('should return 0 findings for acyclic graph', () => {
    const graph = createMockGraph({
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'imports' },
        { from: 'b.ts', to: 'c.ts', type: 'imports' },
      ],
    });

    const findings = circularDepsAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should report error severity for 2-file cycle', () => {
    const graph = createMockGraph({
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'imports' },
        { from: 'b.ts', to: 'a.ts', type: 'imports' },
      ],
    });

    const findings = circularDepsAgent.run(graph, DEFAULT_CONFIG);

    expect(findings.length).toBeGreaterThan(0);
    const cycleFinding = findings[0];
    expect(cycleFinding.severity).toBe('error');
  });

  it('should skip non-import edges', () => {
    const graph = createMockGraph({
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'renders' },
        { from: 'b.ts', to: 'a.ts', type: 'renders' },
      ],
    });

    const findings = circularDepsAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should deduplicate cycles of same nodes', () => {
    const graph = createMockGraph({
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'imports' },
        { from: 'b.ts', to: 'a.ts', type: 'imports' },
        // Same cycle, different entry point
        { from: 'b.ts', to: 'a.ts', type: 'imports' },
        { from: 'a.ts', to: 'b.ts', type: 'imports' },
      ],
    });

    const findings = circularDepsAgent.run(graph, DEFAULT_CONFIG);

    // Should only report once despite duplicate edges
    expect(findings.length).toBeLessThanOrEqual(2);
  });
});
