import type { ProjectGraph, SchemaModel, SchemaEnum } from '../types/index.js';
import { header, section, table, anchor, tocEntry, type GeneratorContext } from './base.js';

export function generateSchema(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const { models, enums } = graph.schema;

  if (models.length === 0 && enums.length === 0) return '';

  let output = header(
    'Schema — Cross-Reference Analysis',
    ctx,
    models.length,
    `models, ${enums.length} enums`,
  );

  // Table of Contents
  output += '## Table of Contents\n\n';
  output += tocEntry('enums', `1. Enums (${enums.length})`);
  output += '\n';
  output += tocEntry('models', `2. Models (${models.length})`);
  output += '\n';
  output += tocEntry('relationship-map', '3. Relationship Map');
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
      output += `- \`${rel.field}\` → \`${rel.target}\` (${rel.type})\n`;
    }
    output += '\n';
  }

  return output;
}

function generateRelationshipMap(models: SchemaModel[]): string {
  let output = `\n---\n\n${section(2, '3. Relationship Map')}\n\n`;

  // Build adjacency list
  const edges: { from: string; to: string; field: string; type: string }[] = [];

  for (const model of models) {
    for (const rel of model.relations) {
      edges.push({
        from: model.name,
        to: rel.target,
        field: rel.field,
        type: rel.type,
      });
    }
  }

  if (edges.length === 0) {
    output += '*No relations found.*\n\n';
    return output;
  }

  output += table(
    ['From', 'Field', 'To', 'Type'],
    edges.map((e) => [`\`${e.from}\``, `\`${e.field}\``, `\`${e.to}\``, e.type]),
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
