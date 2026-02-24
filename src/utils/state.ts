import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import type { FondamentaConfig } from '../types/index.js';

export interface FileState {
  hash: string;
  size: number;
}

export interface AnalysisState {
  version: string;
  analyzedAt: string;
  framework: string;
  files: Record<string, FileState>;
  stats: {
    pages: number;
    components: number;
    apiRoutes: number;
    libs: number;
    models: number;
    enums: number;
  };
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: number;
  isOutdated: boolean;
}

const STATE_FILE = '.fondamenta-state.json';

export function getStatePath(outputDir: string): string {
  return resolve(outputDir, STATE_FILE);
}

export async function saveState(
  outputDir: string,
  projectRoot: string,
  config: FondamentaConfig,
  framework: string,
  stats: AnalysisState['stats'],
): Promise<void> {
  const files = await hashProjectFiles(projectRoot, config);

  const state: AnalysisState = {
    version: '1.0.0',
    analyzedAt: new Date().toISOString(),
    framework,
    files,
    stats,
  };

  const statePath = getStatePath(outputDir);
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

export async function loadState(outputDir: string): Promise<AnalysisState | null> {
  const statePath = getStatePath(outputDir);
  if (!existsSync(statePath)) return null;

  try {
    const content = await readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function computeDiff(
  projectRoot: string,
  config: FondamentaConfig,
  outputDir: string,
): Promise<DiffResult> {
  const previousState = await loadState(outputDir);

  if (!previousState) {
    return {
      added: [],
      removed: [],
      modified: [],
      unchanged: 0,
      isOutdated: true,
    };
  }

  const currentFiles = await hashProjectFiles(projectRoot, config);
  const previousFiles = previousState.files;

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  let unchanged = 0;

  // Find added and modified
  for (const [filePath, state] of Object.entries(currentFiles)) {
    if (!previousFiles[filePath]) {
      added.push(filePath);
    } else if (previousFiles[filePath].hash !== state.hash) {
      modified.push(filePath);
    } else {
      unchanged++;
    }
  }

  // Find removed
  for (const filePath of Object.keys(previousFiles)) {
    if (!currentFiles[filePath]) {
      removed.push(filePath);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    isOutdated: added.length > 0 || removed.length > 0 || modified.length > 0,
  };
}

async function hashProjectFiles(
  projectRoot: string,
  config: FondamentaConfig,
): Promise<Record<string, FileState>> {
  const patterns = ['**/*.ts', '**/*.tsx'];
  const ignore = [
    ...config.exclude,
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
  ];

  const files = await fg(patterns, {
    cwd: projectRoot,
    ignore,
    followSymbolicLinks: false,
    stats: true,
  });

  const result: Record<string, FileState> = {};

  for (const file of files) {
    const filePath = typeof file === 'string' ? file : file.path;
    const fullPath = resolve(projectRoot, filePath);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const hash = createHash('md5').update(content).digest('hex');
      result[filePath] = { hash, size: content.length };
    } catch {
      // skip unreadable files
    }
  }

  return result;
}
