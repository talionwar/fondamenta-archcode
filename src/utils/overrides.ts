import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface OverrideEntry {
  description?: string;
  purpose?: string;
  notes?: string;
  risk?: string;
}

export type Overrides = Record<string, OverrideEntry>;

export function loadOverrides(projectRoot: string, overridesPath?: string): Overrides {
  const filePath = overridesPath
    ? resolve(projectRoot, overridesPath)
    : resolve(projectRoot, '.planning', '.overrides.json');

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function getOverride(overrides: Overrides, key: string): string | undefined {
  const entry = overrides[key];
  if (!entry) return undefined;
  return entry.description || entry.purpose || entry.notes;
}

export function getRisk(overrides: Overrides, key: string): string | undefined {
  return overrides[key]?.risk;
}
