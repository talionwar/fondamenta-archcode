import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDrizzleSchema } from '../../../src/schema/drizzle-parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtureDir = resolve(__dirname, '../../fixtures/drizzle-project/src/db');

describe('Drizzle Schema Parser', () => {
  it('should parse pgTable definitions', () => {
    const result = parseDrizzleSchema(fixtureDir);

    expect(result.models.length).toBeGreaterThanOrEqual(2);
    const userModel = result.models.find((m) => m.name === 'Users');
    expect(userModel).toBeDefined();
    expect(userModel?.fields.length).toBeGreaterThan(0);

    const idField = userModel?.fields.find((f) => f.name === 'id');
    expect(idField?.type).toBe('Int');
    expect(idField?.constraints).toContain('primary key');

    const emailField = userModel?.fields.find((f) => f.name === 'email');
    expect(emailField?.type).toBe('String');
    expect(emailField?.constraints).toContain('unique');
  });

  it('should detect relations', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const userModel = result.models.find((m) => m.name === 'Users');
    expect(userModel?.relations.length).toBeGreaterThan(0);

    const postsRelation = userModel?.relations.find((r) => r.field === 'posts');
    expect(postsRelation).toBeDefined();
    expect(postsRelation?.type).toBe('one-to-many');
  });

  it('should detect foreign key references', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const postModel = result.models.find((m) => m.name === 'Posts');
    expect(postModel).toBeDefined();

    const authorIdField = postModel?.fields.find((f) => f.name === 'authorId');
    expect(authorIdField).toBeDefined();

    // Should have a relation from the .references() call
    const authorRef = postModel?.relations.find((r) => r.field === 'authorId');
    expect(authorRef).toBeDefined();
  });

  it('should parse default values', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const userModel = result.models.find((m) => m.name === 'Users');
    const isActiveField = userModel?.fields.find((f) => f.name === 'isActive');
    expect(isActiveField?.constraints).toContain('@default(true)');

    const createdAtField = userModel?.fields.find((f) => f.name === 'createdAt');
    expect(createdAtField?.constraints).toContain('@default(now())');
  });

  it('should return empty for non-existent directory', () => {
    const result = parseDrizzleSchema('/tmp/nonexistent-drizzle-dir-xyz123');
    expect(result.models).toHaveLength(0);
    expect(result.enums).toHaveLength(0);
  });

  it('should handle directories without drizzle files', () => {
    const result = parseDrizzleSchema('/tmp');
    expect(result.models).toHaveLength(0);
    expect(result.enums).toHaveLength(0);
  });

  it('should properly name-case model names', () => {
    const result = parseDrizzleSchema(fixtureDir);

    // 'users' table should become 'Users'
    const userModel = result.models.find((m) => m.name === 'Users');
    expect(userModel).toBeDefined();

    // 'posts' table should become 'Posts'
    const postModel = result.models.find((m) => m.name === 'Posts');
    expect(postModel).toBeDefined();
  });

  it('should extract field constraints correctly', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const postModel = result.models.find((m) => m.name === 'Posts');
    const titleField = postModel?.fields.find((f) => f.name === 'title');

    expect(titleField?.type).toBe('String');
    expect(titleField?.constraints).toContain('not null');
  });

  it('should detect many-to-one relationships', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const postModel = result.models.find((m) => m.name === 'Posts');
    const authorRelation = postModel?.relations.find((r) => r.field === 'author');

    expect(authorRelation).toBeDefined();
    expect(authorRelation?.type).toBe('one-to-one');
    expect(authorRelation?.target).toBe('Users');
  });

  it('should parse pgEnum definitions', () => {
    const result = parseDrizzleSchema(fixtureDir);

    expect(result.enums.length).toBeGreaterThan(0);

    const userRoleEnum = result.enums.find((e) => e.name === 'user_role');
    expect(userRoleEnum).toBeDefined();
    expect(userRoleEnum?.values).toContain('admin');
    expect(userRoleEnum?.values).toContain('user');
    expect(userRoleEnum?.values).toContain('guest');
  });

  it('should handle multiple enum files', () => {
    const result = parseDrizzleSchema(fixtureDir);

    const enums = result.enums;
    expect(enums.some((e) => e.name === 'user_role')).toBe(true);
    expect(enums.some((e) => e.name === 'post_status')).toBe(true);
  });
});
