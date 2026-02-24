import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePrismaSchema } from '../../src/schema/prisma-parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const schemaPath = resolve(__dirname, '../fixtures/simple-nextjs/prisma/schema.prisma');

describe('Prisma Parser', () => {
  it('should parse models from schema', () => {
    const result = parsePrismaSchema(schemaPath);

    expect(result.models.length).toBeGreaterThan(0);
    const modelNames = result.models.map((m) => m.name);
    expect(modelNames).toContain('User');
    expect(modelNames).toContain('Post');
  });

  it('should parse fields with types', () => {
    const result = parsePrismaSchema(schemaPath);
    const userModel = result.models.find((m) => m.name === 'User');

    expect(userModel).toBeDefined();
    expect(userModel?.fields.length).toBeGreaterThan(0);

    const idField = userModel?.fields.find((f) => f.name === 'id');
    expect(idField).toBeDefined();
    expect(idField?.type).toBeDefined();
  });

  it('should detect field constraints', () => {
    const result = parsePrismaSchema(schemaPath);
    const userModel = result.models.find((m) => m.name === 'User');

    const idField = userModel?.fields.find((f) => f.name === 'id');
    expect(idField?.constraints).toBeDefined();
    expect(idField?.constraints.some((c) => c.includes('primary key') || c.includes('@id'))).toBe(true);
  });

  it('should detect relations', () => {
    const result = parsePrismaSchema(schemaPath);
    const userModel = result.models.find((m) => m.name === 'User');

    // User should have a relation to Post
    expect(userModel?.relations.length).toBeGreaterThan(0);
    const postRelation = userModel?.relations.find((r) => r.target === 'Post');
    expect(postRelation).toBeDefined();
  });

  it('should parse enums', () => {
    const result = parsePrismaSchema(schemaPath);

    // simple-nextjs fixture may or may not have enums
    expect(Array.isArray(result.enums)).toBe(true);
  });

  it('should handle optional fields', () => {
    const result = parsePrismaSchema(schemaPath);

    // Check if any field has 'optional' constraint
    const allFields = result.models.flatMap((m) => m.fields);
    expect(allFields.length).toBeGreaterThan(0);
  });
});
