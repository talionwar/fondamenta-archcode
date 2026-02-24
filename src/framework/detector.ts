import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Framework } from '../types/index.js';

interface DetectionResult {
  framework: Framework;
  confidence: number;
  signals: string[];
}

export async function detectFramework(projectRoot: string): Promise<DetectionResult> {
  const signals: string[] = [];
  let framework: Framework = 'auto';
  let confidence = 0;

  // Check for Next.js
  const hasNextConfig =
    existsSync(join(projectRoot, 'next.config.js')) ||
    existsSync(join(projectRoot, 'next.config.mjs')) ||
    existsSync(join(projectRoot, 'next.config.ts'));

  if (hasNextConfig) {
    signals.push('next.config found');
    confidence += 40;

    // App Router vs Pages Router
    const hasAppDir = existsSync(join(projectRoot, 'app')) || existsSync(join(projectRoot, 'src/app'));
    const hasPagesDir = existsSync(join(projectRoot, 'pages')) || existsSync(join(projectRoot, 'src/pages'));

    if (hasAppDir) {
      framework = 'nextjs-app';
      signals.push('app/ directory found');
      confidence += 30;
    } else if (hasPagesDir) {
      framework = 'nextjs-pages';
      signals.push('pages/ directory found');
      confidence += 30;
    }
  }

  // Check for Nuxt
  if (
    existsSync(join(projectRoot, 'nuxt.config.ts')) ||
    existsSync(join(projectRoot, 'nuxt.config.js'))
  ) {
    framework = 'nuxt';
    signals.push('nuxt.config found');
    confidence = 80;
  }

  // Check for SvelteKit
  if (existsSync(join(projectRoot, 'svelte.config.js'))) {
    framework = 'sveltekit';
    signals.push('svelte.config.js found');
    confidence = 80;
  }

  // Check for Remix
  if (
    existsSync(join(projectRoot, 'remix.config.js')) ||
    existsSync(join(projectRoot, 'app/root.tsx'))
  ) {
    framework = 'remix';
    signals.push('remix signals found');
    confidence = 70;
  }

  // Boost confidence from package.json
  try {
    const pkgPath = join(projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.next) {
        signals.push(`next@${deps.next} in dependencies`);
        confidence = Math.min(confidence + 20, 100);
      }
      if (deps.nuxt) {
        signals.push(`nuxt@${deps.nuxt} in dependencies`);
        confidence = Math.min(confidence + 20, 100);
      }
      if (deps['@sveltejs/kit']) {
        signals.push('@sveltejs/kit in dependencies');
        confidence = Math.min(confidence + 20, 100);
      }
      if (deps['@remix-run/node'] || deps['@remix-run/react']) {
        signals.push('remix packages in dependencies');
        confidence = Math.min(confidence + 20, 100);
      }
    }
  } catch {
    // ignore parse errors
  }

  return { framework, confidence, signals };
}
