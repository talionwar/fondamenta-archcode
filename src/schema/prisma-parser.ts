import { readFileSync } from 'node:fs';
import type { SchemaModel, SchemaField, SchemaRelation, SchemaEnum } from '../types/index.js';

interface PrismaParseResult {
  models: SchemaModel[];
  enums: SchemaEnum[];
}

export function parsePrismaSchema(schemaPath: string): PrismaParseResult {
  const content = readFileSync(schemaPath, 'utf-8');
  const models: SchemaModel[] = [];
  const enums: SchemaEnum[] = [];

  // Parse enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const name = enumMatch[1];
    const body = enumMatch[2];
    const values = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));
    enums.push({ name, values });
  }

  // Parse models
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const name = modelMatch[1];
    const body = modelMatch[2];
    const fields: SchemaField[] = [];
    const relations: SchemaRelation[] = [];

    const lines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'));

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const fieldName = parts[0];
      let fieldType = parts[1];

      // Skip directives
      if (fieldName.startsWith('@')) continue;

      const constraints: string[] = [];

      // Check for optional
      if (fieldType.endsWith('?')) {
        fieldType = fieldType.slice(0, -1);
        constraints.push('optional');
      }

      // Check for array
      if (fieldType.endsWith('[]')) {
        fieldType = fieldType.slice(0, -2);
        constraints.push('array');
      }

      // Extract decorators
      const decorators = line.match(/@\w+(\([^)]*\))?/g) ?? [];
      for (const d of decorators) {
        if (d.startsWith('@id')) constraints.push('primary key');
        if (d.startsWith('@unique')) constraints.push('unique');
        if (d.startsWith('@default')) constraints.push(d);
        if (d.startsWith('@map')) constraints.push(d);
        if (d.startsWith('@updatedAt')) constraints.push('auto-updated');
      }

      fields.push({ name: fieldName, type: fieldType, constraints });

      // Detect relations
      const relationMatch = line.match(/@relation\(([^)]*)\)/);
      if (relationMatch) {
        const isArray = line.includes('[]');
        relations.push({
          field: fieldName,
          target: fieldType,
          type: isArray ? 'one-to-many' : 'one-to-one',
        });
      }

      // Also detect implicit relations (type is another model name)
      if (
        fieldType[0] === fieldType[0].toUpperCase() &&
        !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes'].includes(fieldType) &&
        !enums.some((e) => e.name === fieldType)
      ) {
        if (!relations.some((r) => r.field === fieldName)) {
          const isArray = line.includes('[]');
          relations.push({
            field: fieldName,
            target: fieldType,
            type: isArray ? 'one-to-many' : 'one-to-one',
          });
        }
      }
    }

    models.push({ name, fields, relations });
  }

  return { models, enums };
}
