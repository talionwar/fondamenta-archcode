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

    // Expand usedModels via transitive relation closure:
    // If model A is used and has a relation to model B, B is also "in use"
    // (e.g. prisma.contentQuiz.findMany({ include: { questions: true } })
    //  uses ContentQuestion even though prisma.contentQuestion is never called directly)
    const relationMap = new Map<string, Set<string>>();
    for (const model of graph.schema.models) {
      const targets = new Set<string>();
      for (const rel of model.relations) {
        targets.add(rel.target);
      }
      relationMap.set(model.name, targets);
    }

    // Normalise to PascalCase for lookup
    const toPascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const expandedUsedModels = new Set<string>(usedModels);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [modelName, targets] of relationMap) {
        const lc = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        if (expandedUsedModels.has(modelName) || expandedUsedModels.has(lc)) {
          for (const target of targets) {
            if (!expandedUsedModels.has(target) && !expandedUsedModels.has(target.charAt(0).toLowerCase() + target.slice(1))) {
              expandedUsedModels.add(target);
              changed = true;
            }
          }
        }
      }
    }

    // 1. Models used in code but not in schema
    for (const model of usedModels) {
      // Prisma uses lowercase model names in client (e.g., prisma.user)
      // Schema has PascalCase (e.g., User)
      const pascalCase = toPascal(model);
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

    // 2. Schema models never referenced in code (direct OR via relations)
    for (const model of graph.schema.models) {
      const lowerName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      if (!expandedUsedModels.has(model.name) && !expandedUsedModels.has(lowerName)) {
        // Skip common framework models
        if (['Account', 'Session', 'VerificationToken'].includes(model.name)) continue;

        findings.push({
          agentId: 'schema-drift',
          severity: 'info',
          title: 'Unused schema model',
          message: `Schema model \`${model.name}\` is never referenced in any API route, page data fetching, or schema relation from a used model`,
          suggestion: 'Remove the model if no longer needed, or add code that uses it',
        });
      }
    }

    return findings;
  },
};
