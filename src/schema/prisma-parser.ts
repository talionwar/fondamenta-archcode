import { readFileSync } from 'node:fs';
import type { SchemaModel, SchemaField, SchemaRelation, SchemaEnum } from '../types/index.js';

export interface PrismaParseResult {
  models: SchemaModel[];
  enums: SchemaEnum[];
  cascadeCount: number;
  setNullCount: number;
}

const PRISMA_SCALAR_TYPES = new Set([
  'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes',
]);

/**
 * Extract brace-balanced blocks for a given keyword (model, enum, etc.)
 * Handles nested braces correctly — unlike [^}]+ regex which fails on @default({})
 */
function extractBlocks(content: string, keyword: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  const headerRegex = new RegExp(`${keyword}\\s+(\\w+)\\s*\\{`, 'g');
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      blocks.push({ name: match[1], body: content.substring(match.index + match[0].length, i - 1) });
    }
  }
  return blocks;
}

/**
 * Parse a single model block into a SchemaModel
 */
function parseModelBlock(name: string, body: string, enumNames: Set<string>): SchemaModel {
  const fields: SchemaField[] = [];
  const relations: SchemaRelation[] = [];
  const indexes: string[] = [];
  const uniqueConstraints: string[] = [];

  const allLines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));

  // Extract @@index and @@unique before filtering out @@ lines
  for (const line of allLines) {
    const indexMatch = line.match(/@@index\(\[([^\]]+)\]/);
    if (indexMatch) {
      indexes.push(indexMatch[1].replace(/"/g, '').trim());
    }
    const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\]/);
    if (uniqueMatch) {
      uniqueConstraints.push(uniqueMatch[1].replace(/"/g, '').trim());
    }
  }

  const lines = allLines.filter((l) => !l.startsWith('@@'));

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

    // Detect explicit relations
    const relationMatch = line.match(/@relation\(([^)]*)\)/);
    if (relationMatch) {
      const relBody = relationMatch[1];
      const isArray = line.includes('[]');
      const onDeleteMatch = relBody.match(/onDelete:\s*(\w+)/);
      const fkFieldsMatch = relBody.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = relBody.match(/references:\s*\[([^\]]+)\]/);

      const isManyToMany = isArray && !fkFieldsMatch;
      relations.push({
        field: fieldName,
        target: fieldType,
        type: isManyToMany ? 'many-to-many' : isArray ? 'one-to-many' : 'one-to-one',
        onDelete: onDeleteMatch?.[1],
        fkFields: fkFieldsMatch?.[1].split(',').map((s) => s.trim()),
        references: referencesMatch?.[1].split(',').map((s) => s.trim()),
      });
    }

    // Detect implicit relations — exclude scalars AND enums
    if (
      fieldType[0] === fieldType[0].toUpperCase() &&
      !PRISMA_SCALAR_TYPES.has(fieldType) &&
      !enumNames.has(fieldType)
    ) {
      if (!relations.some((r) => r.field === fieldName)) {
        const isArray = line.includes('[]');
        const isManyToMany = isArray && !line.includes('@relation');
        relations.push({
          field: fieldName,
          target: fieldType,
          type: isManyToMany ? 'many-to-many' : isArray ? 'one-to-many' : 'one-to-one',
        });
      }
    }
  }

  return {
    name,
    fields,
    relations,
    ...(indexes.length > 0 && { indexes }),
    ...(uniqueConstraints.length > 0 && { uniqueConstraints }),
  };
}

export function parsePrismaSchema(schemaPath: string): PrismaParseResult {
  const content = readFileSync(schemaPath, 'utf-8');

  // First pass: collect ALL enum names (handles forward references)
  const enumBlocks = extractBlocks(content, 'enum');
  const enumNames = new Set(enumBlocks.map((b) => b.name));
  const enums: SchemaEnum[] = enumBlocks.map((b) => ({
    name: b.name,
    values: b.body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//')),
  }));

  // Second pass: parse models with enum awareness
  const modelBlocks = extractBlocks(content, 'model');
  const models = modelBlocks.map((b) => parseModelBlock(b.name, b.body, enumNames));

  // Compute cascade/setNull stats
  let cascadeCount = 0;
  let setNullCount = 0;
  for (const model of models) {
    for (const rel of model.relations) {
      if (rel.onDelete === 'Cascade') cascadeCount++;
      if (rel.onDelete === 'SetNull') setNullCount++;
    }
  }

  return { models, enums, cascadeCount, setNullCount };
}
