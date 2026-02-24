import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

export const conventionEnforcerAgent: Agent = {
  id: 'convention-enforcer',
  name: 'Convention Enforcer',
  description: 'Checks naming conventions, barrel exports, and consistency of auth patterns',
  tier: 'pro',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // 1. Component naming: files should match exported component name
    for (const comp of graph.components) {
      const fileName = comp.filePath.split('/').pop()?.replace(/\.\w+$/, '');
      if (!fileName) continue;

      // Skip index files
      if (fileName === 'index') continue;

      // Component name should be PascalCase version of file name
      const isHook = comp.name.startsWith('use');
      if (isHook) {
        // Hooks should be camelCase matching filename
        if (fileName !== comp.name && !fileName.includes(comp.name)) {
          // Allow kebab-case filenames like use-something → useSomething
          const camelFromKebab = fileName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          if (camelFromKebab !== comp.name) {
            findings.push({
              agentId: 'convention-enforcer',
              severity: 'info',
              title: 'Hook naming mismatch',
              filePath: comp.filePath,
              message: `File \`${fileName}\` exports hook \`${comp.name}\``,
              suggestion: `Rename file to \`${comp.name}.ts\` or rename the hook`,
            });
          }
        }
      }
    }

    // 2. Mixed auth patterns
    const authPatterns = new Map<string, string[]>();
    for (const route of graph.apiRoutes) {
      if (route.auth === 'None') continue;
      if (!authPatterns.has(route.auth)) {
        authPatterns.set(route.auth, []);
      }
      authPatterns.get(route.auth)!.push(route.filePath);
    }

    if (authPatterns.size > 1) {
      const patterns = [...authPatterns.entries()]
        .map(([pattern, files]) => `${pattern} (${files.length} routes)`)
        .join(', ');

      findings.push({
        agentId: 'convention-enforcer',
        severity: 'warning',
        title: 'Inconsistent auth patterns',
        message: `Multiple auth patterns detected: ${patterns}`,
        suggestion: 'Standardize on a single auth pattern across all API routes',
      });
    }

    // 3. API route naming: should be kebab-case
    for (const route of graph.apiRoutes) {
      const segments = route.routePath.split('/').filter(Boolean);
      for (const seg of segments) {
        if (seg.startsWith('[')) continue; // Skip dynamic segments
        if (seg !== seg.toLowerCase()) {
          findings.push({
            agentId: 'convention-enforcer',
            severity: 'info',
            title: 'Non-kebab-case route',
            filePath: route.filePath,
            message: `Route segment \`${seg}\` in \`${route.routePath}\` is not lowercase`,
            suggestion: 'Use kebab-case for route segments',
          });
          break; // One finding per route
        }
      }
    }

    // 4. Barrel exports: directories with >3 files but no index.ts
    const dirFiles = new Map<string, string[]>();
    for (const [id] of graph.nodes) {
      const dir = id.split('/').slice(0, -1).join('/');
      if (!dirFiles.has(dir)) dirFiles.set(dir, []);
      dirFiles.get(dir)!.push(id);
    }

    for (const [dir, files] of dirFiles) {
      if (files.length < 4) continue;
      if (dir.includes('app/') || dir.includes('pages/')) continue; // App router dirs don't need barrels

      const hasIndex = files.some(
        (f) => f.endsWith('/index.ts') || f.endsWith('/index.tsx'),
      );
      if (!hasIndex) {
        findings.push({
          agentId: 'convention-enforcer',
          severity: 'info',
          title: 'Missing barrel export',
          filePath: dir,
          message: `Directory has ${files.length} files but no index.ts barrel export`,
          suggestion: 'Add an index.ts to re-export public API',
        });
      }
    }

    return findings;
  },
};
