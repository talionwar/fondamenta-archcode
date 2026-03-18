import type { SchemaModel } from '../types/index.js';
import { header, section, table, tocEntry, type GeneratorContext } from './base.js';

export function generateSchema(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const { models, enums } = graph.schema;

  if (models.length === 0 && enums.length === 0) return '';

  // Count cascade/setNull across all relations
  let cascadeCount = 0;
  let setNullCount = 0;
  for (const model of models) {
    for (const rel of model.relations) {
      if (rel.onDelete === 'Cascade') cascadeCount++;
      if (rel.onDelete === 'SetNull') setNullCount++;
    }
  }

  let output = header(
    'Schema — Cross-Reference Analysis',
    ctx,
    models.length,
    `models, ${enums.length} enums`,
  );

  // Stats summary
  if (cascadeCount > 0 || setNullCount > 0) {
    output += '> **Deletion stats:** ';
    const parts: string[] = [];
    if (cascadeCount > 0) parts.push(`${cascadeCount} Cascade`);
    if (setNullCount > 0) parts.push(`${setNullCount} SetNull`);
    output += parts.join(', ');
    if (setNullCount > 0) output += ' ⚠️ (orphan risk)';
    output += '\n\n';
  }

  // Table of Contents
  output += '## Table of Contents\n\n';
  output += tocEntry('enums', `1. Enums (${enums.length})`);
  output += '\n';
  output += tocEntry('models', `2. Models (${models.length})`);
  output += '\n';
  output += tocEntry('relationship-map', '3. Relationship Map');
  if (setNullCount > 0) {
    output += '\n';
    output += tocEntry('orphan-risk', '4. Orphan Risk Analysis');
  }
  output += '\n\n---\n\n';

  // Enums
  output += `${section(2, '1. Enums')}\n\n`;
  if (enums.length > 0) {
    output += table(
      ['Enum', 'Values'],
      enums.map((e) => [`\`${e.name}\``, e.values.map((v) => `\`${v}\``).join(', ')]),
    );
    output += '\n\n';
  } else {
    output += '*No enums found.*\n\n';
  }

  // Models
  output += `${section(2, '2. Models')}\n\n`;

  for (const model of models) {
    output += generateModelEntry(model);
  }

  // Relationship map
  output += generateRelationshipMap(models);

  // Orphan Risk section
  output += generateOrphanRisk(models);

  return output;
}

function generateModelEntry(model: SchemaModel): string {
  let output = `${section(3, `\`${model.name}\``)}\n\n`;

  // Fields table
  output += table(
    ['Field', 'Type', 'Constraints'],
    model.fields.map((f) => [
      `\`${f.name}\``,
      `\`${f.type}\``,
      f.constraints.join(', ') || '-',
    ]),
  );
  output += '\n\n';

  // Relations
  if (model.relations.length > 0) {
    output += '**Relations:**\n';
    for (const rel of model.relations) {
      let relLine = `- \`${rel.field}\` → \`${rel.target}\` (${rel.type})`;
      if (rel.onDelete) {
        relLine += ` — onDelete: ${rel.onDelete}`;
        if (rel.onDelete === 'SetNull') relLine += ' **⚠️ ORPHAN RISK**';
      }
      if (rel.fkFields?.length) {
        relLine += ` [FK: ${rel.fkFields.join(', ')}]`;
      }
      output += relLine + '\n';
    }
    output += '\n';
  }

  // Indexes
  if (model.indexes?.length) {
    output += '**Indexes:** ';
    output += model.indexes.map((idx) => `\`[${idx}]\``).join(', ');
    output += '\n\n';
  }

  // Unique constraints
  if (model.uniqueConstraints?.length) {
    output += '**Unique constraints:** ';
    output += model.uniqueConstraints.map((uc) => `\`[${uc}]\``).join(', ');
    output += '\n\n';
  }

  return output;
}

function generateRelationshipMap(models: SchemaModel[]): string {
  let output = `\n---\n\n${section(2, '3. Relationship Map')}\n\n`;

  // Build adjacency list
  const edges: { from: string; to: string; field: string; type: string; onDelete?: string }[] = [];

  for (const model of models) {
    for (const rel of model.relations) {
      edges.push({
        from: model.name,
        to: rel.target,
        field: rel.field,
        type: rel.type,
        onDelete: rel.onDelete,
      });
    }
  }

  if (edges.length === 0) {
    output += '*No relations found.*\n\n';
    return output;
  }

  output += table(
    ['From', 'Field', 'To', 'Type', 'onDelete'],
    edges.map((e) => [`\`${e.from}\``, `\`${e.field}\``, `\`${e.to}\``, e.type, e.onDelete || '-']),
  );
  output += '\n\n';

  // Count connections per model
  const connectionCount: Record<string, number> = {};
  for (const edge of edges) {
    connectionCount[edge.from] = (connectionCount[edge.from] || 0) + 1;
    connectionCount[edge.to] = (connectionCount[edge.to] || 0) + 1;
  }

  const sorted = Object.entries(connectionCount).sort((a, b) => b[1] - a[1]);
  output += `${section(3, 'Most Connected Models')}\n\n`;
  output += table(
    ['Model', 'Connections'],
    sorted.slice(0, 15).map(([model, count]) => [`\`${model}\``, String(count)]),
  );
  output += '\n\n';

  return output;
}

function generateOrphanRisk(models: SchemaModel[]): string {
  const risks: { model: string; field: string; target: string; fkFields?: string[] }[] = [];

  for (const model of models) {
    for (const rel of model.relations) {
      if (rel.onDelete === 'SetNull') {
        risks.push({
          model: model.name,
          field: rel.field,
          target: rel.target,
          fkFields: rel.fkFields,
        });
      }
    }
  }

  if (risks.length === 0) return '';

  let output = `\n---\n\n${section(2, '4. Orphan Risk Analysis')}\n\n`;
  output += '> Relations with `onDelete: SetNull` may leave orphaned records when the parent is deleted.\n\n';
  output += table(
    ['Model', 'Field', 'Target', 'FK Fields'],
    risks.map((r) => [
      `\`${r.model}\``,
      `\`${r.field}\``,
      `\`${r.target}\``,
      r.fkFields ? r.fkFields.map((f) => `\`${f}\``).join(', ') : '-',
    ]),
  );
  output += '\n\n';

  return output;
}
