import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

export const schemaDriftAgent: Agent = {
  id: 'schema-drift',
  name: 'Schema Drift Detector',
  description: 'Finds models referenced in code but missing from schema, and schema models never used in code',
  tier: 'pro',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    if (graph.schema.models.length === 0) {
      findings.push({
        agentId: 'schema-drift',
        severity: 'info',
        title: 'No schema detected',
        message: 'No ORM schema found — schema drift checks skipped',
      });
      return findings;
    }

    const schemaModelNames = new Set(graph.schema.models.map((m) => m.name));

    // Collect all model references from API routes
    const usedModels = new Set<string>();
    for (const route of graph.apiRoutes) {
      for (const model of route.models) {
        usedModels.add(model);
      }
    }

    // Also check pages' data fetching
    for (const page of graph.pages) {
      for (const df of page.dataFetching) {
        if (df.model) usedModels.add(df.model);
      }
    }

    // 1. Models used in code but not in schema
    for (const model of usedModels) {
      // Prisma uses lowercase model names in client (e.g., prisma.user)
      // Schema has PascalCase (e.g., User)
      const pascalCase = model.charAt(0).toUpperCase() + model.slice(1);
      if (!schemaModelNames.has(model) && !schemaModelNames.has(pascalCase)) {
        findings.push({
          agentId: 'schema-drift',
          severity: 'warning',
          title: 'Model used but not in schema',
          message: `\`prisma.${model}\` is used in code but no matching model found in schema`,
          suggestion: 'Add the model to your schema or fix the reference',
        });
      }
    }

    // 2. Schema models never referenced in code
    for (const model of graph.schema.models) {
      const lowerName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      if (!usedModels.has(model.name) && !usedModels.has(lowerName)) {
        // Skip common framework models
        if (['Account', 'Session', 'VerificationToken'].includes(model.name)) continue;

        findings.push({
          agentId: 'schema-drift',
          severity: 'info',
          title: 'Unused schema model',
          message: `Schema model \`${model.name}\` is never referenced in any API route or page data fetching`,
          suggestion: 'Remove the model if no longer needed, or add code that uses it',
        });
      }
    }

    return findings;
  },
};
