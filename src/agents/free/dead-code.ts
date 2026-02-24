import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

export const deadCodeAgent: Agent = {
  id: 'dead-code',
  name: 'Dead Code Detector',
  description: 'Finds exports never imported, components with no usedBy, orphan API routes and lib files',
  tier: 'free',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // Build a set of all imported specifiers across the project
    const importedSpecifiers = new Set<string>();
    const importedPaths = new Set<string>();

    for (const [, node] of graph.nodes) {
      for (const imp of node.metadata.imports) {
        for (const spec of imp.specifiers) {
          importedSpecifiers.add(spec);
        }
        if (imp.resolvedPath) {
          importedPaths.add(imp.resolvedPath);
        }
      }
    }

    // Check components with empty usedBy
    for (const comp of graph.components) {
      if (comp.usedBy.length === 0) {
        const node = graph.nodes.get(comp.filePath);

        // Skip page entry points and hooks
        if (node?.type === 'page' || node?.type === 'hook') continue;

        // Skip Next.js implicit files (auto-imported by App Router)
        const fileName = comp.filePath.split('/').pop() ?? '';
        if (/^(layout|loading|error|not-found|template|default|global-error)\.(tsx|ts)$/.test(fileName)) continue;

        // Skip index/barrel files
        if (comp.filePath.endsWith('/index.ts') || comp.filePath.endsWith('/index.tsx')) continue;

        findings.push({
          agentId: 'dead-code',
          severity: 'warning',
          title: 'Orphan component',
          filePath: comp.filePath,
          message: `Component \`${comp.name}\` is never imported or rendered by any other file`,
          suggestion: 'Remove the file or restore the import',
        });
      }
    }

    // Check lib files with empty usedBy
    for (const lib of graph.libs) {
      if (lib.usedBy.length === 0) {
        const fileName = lib.filePath.split('/').pop() ?? '';

        // Skip config/types/declaration files
        if (/\.config\.|\.d\.ts|^types\.ts|types\/index\.ts/.test(lib.filePath)) continue;
        // Skip index/barrel files
        if (lib.filePath.endsWith('/index.ts') || lib.filePath.endsWith('/index.tsx')) continue;

        // Skip barrel re-exports: files with only re-exports and no own logic
        const node = graph.nodes.get(lib.filePath);
        if (node && lib.exports.length > 0) {
          const hasOwnLogic = node.metadata.exports.some(
            (exp) => !node.metadata.imports.some((imp) => imp.specifiers.includes(exp.name))
          );
          if (!hasOwnLogic) continue;
        }

        findings.push({
          agentId: 'dead-code',
          severity: 'warning',
          title: 'Orphan lib file',
          filePath: lib.filePath,
          message: `Lib file has ${lib.exports.length} export(s) but is never imported`,
          suggestion: 'Remove the file or restore imports',
        });
      }
    }

    // Check exports that are never imported (sampling top-level named exports)
    for (const [, node] of graph.nodes) {
      if (node.type === 'page' || node.type === 'api-route') continue;

      for (const exp of node.metadata.exports) {
        if (exp.name === 'default') continue;
        if (exp.isTypeOnly) continue;

        if (!importedSpecifiers.has(exp.name)) {
          // Only report if the file itself IS imported (otherwise caught by orphan checks)
          const fileIsImported = graph.edges.some((e) => e.to === node.id);
          if (!fileIsImported) continue;

          findings.push({
            agentId: 'dead-code',
            severity: 'info',
            title: 'Unused export',
            filePath: node.filePath,
            message: `Export \`${exp.name}\` (${exp.kind}) is never imported by any file in the project`,
            suggestion: 'Remove the export or mark it as internal',
          });
        }
      }
    }

    return findings;
  },
};
