import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import type { SchemaModel, SchemaField, SchemaRelation, SchemaEnum } from '../types/index.js';

interface DrizzleParseResult {
  models: SchemaModel[];
  enums: SchemaEnum[];
}

export function parseDrizzleSchema(schemaDir: string): DrizzleParseResult {
  const models: SchemaModel[] = [];
  const enums: SchemaEnum[] = [];

  // Find all .ts files in schema directory
  const files = findSchemaFiles(schemaDir);

  // Track table variable names -> model names for relation resolution
  const tableVarMap = new Map<string, string>();

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    // Skip files that don't import from drizzle-orm
    if (!content.includes('drizzle-orm')) continue;

    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

    // Extract tables
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;

          // Check for pgTable/mysqlTable/sqliteTable calls
          if (ts.isCallExpression(decl.initializer)) {
            const callText = decl.initializer.expression.getText(sourceFile);
            if (['pgTable', 'mysqlTable', 'sqliteTable'].includes(callText)) {
              const model = parseTableCall(decl.name.text, decl.initializer, sourceFile);
              if (model) {
                tableVarMap.set(decl.name.text, model.name);
                // Avoid duplicates
                if (!models.some((m) => m.name === model.name)) {
                  models.push(model);
                }
              }
            }
          }
        }
      }
    });

    // Extract relations (second pass)
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;

          const callText = decl.initializer.expression.getText(sourceFile);
          if (callText === 'relations') {
            parseRelationsCall(decl.initializer, sourceFile, models, tableVarMap);
          }
        }
      }
    });

    // Extract pgEnum calls
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
          if (!ts.isCallExpression(decl.initializer)) continue;

          const callText = decl.initializer.expression.getText(sourceFile);
          if (callText === 'pgEnum' || callText === 'mysqlEnum') {
            const enumResult = parseEnumCall(decl.name.text, decl.initializer, sourceFile);
            if (enumResult) {
              // Avoid duplicates
              if (!enums.some((e) => e.name === enumResult.name)) {
                enums.push(enumResult);
              }
            }
          }
        }
      }
    });
  }

  return { models, enums };
}

function findSchemaFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findSchemaFiles(fullPath));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or cannot be read
  }
  return files;
}

function parseTableCall(varName: string, call: ts.CallExpression, sf: ts.SourceFile): SchemaModel | null {
  const args = call.arguments;
  if (args.length < 2) return null;

  // First arg: table name string
  let tableName = varName;
  if (ts.isStringLiteral(args[0])) {
    tableName = args[0].text;
  }

  // Second arg: columns object
  if (!ts.isObjectLiteralExpression(args[1])) return null;

  const fields: SchemaField[] = [];
  const relations: SchemaRelation[] = [];

  for (const prop of args[1].properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

    const fieldName = prop.name.text;
    const { type, constraints, referencesTable } = parseColumnExpression(prop.initializer, sf);

    fields.push({ name: fieldName, type, constraints });

    if (referencesTable) {
      relations.push({
        field: fieldName,
        target: referencesTable,
        type: 'one-to-one',
      });
    }
  }

  // PascalCase the model name (first letter uppercase + CamelCase)
  const modelName = toPascalCase(tableName);

  return { name: modelName, fields, relations };
}

function toPascalCase(str: string): string {
  // Handle snake_case conversion
  const camelCase = str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  // Capitalize first letter
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

function parseColumnExpression(
  expr: ts.Expression,
  sf: ts.SourceFile,
): { type: string; constraints: string[]; referencesTable?: string } {
  const text = expr.getText(sf);
  const constraints: string[] = [];
  let type = 'unknown';
  let referencesTable: string | undefined;

  // Extract base type from the first call (serial, text, integer, etc)
  const typeMatch = text.match(
    /^(serial|text|varchar|integer|bigint|boolean|timestamp|date|json|jsonb|real|doublePrecision|uuid|numeric|decimal|smallint|char|blob|binary|varbinary|tinyint|mediumint|longtext)/,
  );
  if (typeMatch) {
    const drizzleTypeMap: Record<string, string> = {
      serial: 'Int',
      text: 'String',
      varchar: 'String',
      char: 'String',
      integer: 'Int',
      bigint: 'BigInt',
      smallint: 'Int',
      tinyint: 'Int',
      mediumint: 'Int',
      boolean: 'Boolean',
      timestamp: 'DateTime',
      date: 'DateTime',
      json: 'Json',
      jsonb: 'Json',
      real: 'Float',
      doublePrecision: 'Float',
      numeric: 'Decimal',
      decimal: 'Decimal',
      uuid: 'String',
      blob: 'Bytes',
      binary: 'Bytes',
      varbinary: 'Bytes',
      longtext: 'String',
    };
    type = drizzleTypeMap[typeMatch[1]] || typeMatch[1];
  }

  // Extract constraints from chained calls
  if (text.includes('.primaryKey()')) constraints.push('primary key');
  if (text.includes('.notNull()')) constraints.push('not null');
  if (text.includes('.unique()')) constraints.push('unique');
  if (text.includes('.defaultNow()')) constraints.push('@default(now())');
  if (text.includes('.default(')) {
    const defaultMatch = text.match(/\.default\(([^)]+)\)/);
    if (defaultMatch) constraints.push(`@default(${defaultMatch[1]})`);
  }

  // Extract references
  const refMatch = text.match(/\.references\(\s*\(\)\s*=>\s*(\w+)\.\w+/);
  if (refMatch) {
    referencesTable = refMatch[1];
  }

  return { type, constraints, referencesTable };
}

function parseRelationsCall(
  call: ts.CallExpression,
  sf: ts.SourceFile,
  models: SchemaModel[],
  tableVarMap: Map<string, string>,
): void {
  const args = call.arguments;
  if (args.length < 2) return;

  // First arg: the table variable
  const tableVar = args[0].getText(sf);
  const modelName = tableVarMap.get(tableVar);
  if (!modelName) return;

  const model = models.find((m) => m.name === modelName);
  if (!model) return;

  // Second arg: function with relation definitions
  const text = args[1].getText(sf);

  // Extract one() and many() calls
  const oneMatches = text.matchAll(/(\w+):\s*one\((\w+)/g);
  for (const m of oneMatches) {
    const target = tableVarMap.get(m[2]) || m[2];
    if (!model.relations.some((r) => r.field === m[1])) {
      model.relations.push({ field: m[1], target, type: 'one-to-one' });
    }
  }

  const manyMatches = text.matchAll(/(\w+):\s*many\((\w+)/g);
  for (const m of manyMatches) {
    const target = tableVarMap.get(m[2]) || m[2];
    if (!model.relations.some((r) => r.field === m[1])) {
      model.relations.push({ field: m[1], target, type: 'one-to-many' });
    }
  }
}

function parseEnumCall(varName: string, call: ts.CallExpression, sf: ts.SourceFile): SchemaEnum | null {
  const args = call.arguments;
  if (args.length < 2) return null;

  // First arg: enum name string
  let enumName = varName;
  if (ts.isStringLiteral(args[0])) {
    enumName = args[0].text;
  }

  // Second arg: array of values
  if (!ts.isArrayLiteralExpression(args[1])) return null;

  const values = args[1].elements
    .filter(ts.isStringLiteral)
    .map((el) => el.text);

  return { name: enumName, values };
}
