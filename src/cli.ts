import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve, basename } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { analyzeProject } from './analyzers/project-analyzer.js';
import {
  generatePages,
  generateComponents,
  generateApiRoutes,
  generateLib,
  generateSchema,
  generateComponentGraph,
  generateDependencyMap,
} from './generators/index.js';
import { DEFAULT_CONFIG, type FondamentaConfig } from './types/index.js';

const VERSION = '0.1.0';

const program = new Command();

program
  .name('fondamenta')
  .description('Zero-dependency codebase intelligence for AI agents. Static analysis → structured Markdown.')
  .version(VERSION);

program
  .command('analyze')
  .description('Analyze a project and generate structured documentation')
  .argument('[path]', 'Project root directory', '.')
  .option('-o, --output <dir>', 'Output directory', '.planning')
  .option('-f, --framework <name>', 'Force framework detection (nextjs-app, nextjs-pages, nuxt, sveltekit, remix)')
  .option('--no-schema', 'Skip ORM schema analysis')
  .option('-v, --verbose', 'Show detailed progress')
  .action(async (path: string, opts: Record<string, unknown>) => {
    const projectRoot = resolve(path);
    const outputDir = resolve(projectRoot, opts.output as string);
    const verbose = opts.verbose as boolean;

    console.log('');
    console.log(chalk.bold('  FONDAMENTA'));
    console.log(chalk.dim(`  v${VERSION} — Zero-dependency codebase intelligence`));
    console.log('');

    // Validate project
    if (!existsSync(projectRoot)) {
      console.error(chalk.red(`  Error: Directory not found: ${projectRoot}`));
      process.exit(1);
    }

    // Load config
    const config = await loadConfig(projectRoot, opts);

    // Framework detection
    const spinnerDetect = ora('  Detecting framework...').start();
    const { detectFramework } = await import('./framework/detector.js');
    const detection = await detectFramework(projectRoot);

    if (config.framework === 'auto') {
      config.framework = detection.framework;
    }

    spinnerDetect.succeed(
      `  Framework: ${chalk.cyan(config.framework)} ${chalk.dim(`(${detection.confidence}% confidence)`)}`,
    );
    if (verbose && detection.signals.length > 0) {
      for (const signal of detection.signals) {
        console.log(chalk.dim(`    → ${signal}`));
      }
    }

    // Analyze
    const spinnerAnalyze = ora('  Analyzing codebase...').start();
    const result = await analyzeProject(projectRoot, config);
    spinnerAnalyze.succeed(
      `  Analyzed ${chalk.cyan(String(result.totalFiles))} files in ${chalk.cyan(`${result.duration}ms`)}`,
    );

    // Stats
    const { graph } = result;
    console.log('');
    console.log(chalk.dim('  Found:'));
    console.log(chalk.dim(`    ${graph.pages.length} pages`));
    console.log(chalk.dim(`    ${graph.components.length} components/hooks`));
    console.log(chalk.dim(`    ${graph.apiRoutes.length} API routes`));
    console.log(chalk.dim(`    ${graph.libs.length} lib files`));
    console.log(chalk.dim(`    ${graph.schema.models.length} DB models, ${graph.schema.enums.length} enums`));
    console.log('');

    // Generate outputs
    const spinnerGen = ora('  Generating documentation...').start();

    const projectName = await getProjectName(projectRoot);
    const ctx = {
      graph: result.graph,
      projectName,
      generatedAt: new Date().toISOString().split('T')[0],
    };

    await mkdir(resolve(outputDir, 'dependencies'), { recursive: true });

    const generators: { name: string; fn: () => string; path: string; enabled: boolean }[] = [
      {
        name: 'pages',
        fn: () => generatePages(ctx),
        path: 'dependencies/pages-atomic.md',
        enabled: config.generators.pages,
      },
      {
        name: 'components',
        fn: () => generateComponents(ctx),
        path: 'dependencies/components-atomic.md',
        enabled: config.generators.components,
      },
      {
        name: 'api-routes',
        fn: () => generateApiRoutes(ctx),
        path: 'dependencies/api-routes-atomic.md',
        enabled: config.generators.apiRoutes,
      },
      {
        name: 'lib',
        fn: () => generateLib(ctx),
        path: 'dependencies/lib-atomic.md',
        enabled: config.generators.lib,
      },
      {
        name: 'schema',
        fn: () => generateSchema(ctx),
        path: 'dependencies/schema-crossref-atomic.md',
        enabled: config.generators.schemaXref,
      },
      {
        name: 'component-graph',
        fn: () => generateComponentGraph(ctx),
        path: 'dependencies/component-graph.md',
        enabled: config.generators.componentGraph,
      },
      {
        name: 'dependency-map',
        fn: () => generateDependencyMap(ctx, result.framework),
        path: 'DEPENDENCY-MAP.md',
        enabled: config.generators.dependencyMap,
      },
    ];

    let filesWritten = 0;
    for (const gen of generators) {
      if (!gen.enabled) continue;

      const content = gen.fn();
      if (content) {
        const filePath = resolve(outputDir, gen.path);
        await writeFile(filePath, content, 'utf-8');
        filesWritten++;
        if (verbose) {
          console.log(chalk.dim(`    ✓ ${gen.path}`));
        }
      }
    }

    spinnerGen.succeed(`  Generated ${chalk.cyan(String(filesWritten))} files → ${chalk.cyan(outputDir)}`);

    console.log('');
    console.log(chalk.green('  Done!'));
    console.log(chalk.dim(`  Output: ${outputDir}`));
    console.log('');
  });

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    const configPath = resolve('fondamenta.config.ts');

    if (existsSync(configPath)) {
      console.log(chalk.yellow('  fondamenta.config.ts already exists'));
      return;
    }

    const configContent = `import { defineConfig } from 'fondamenta';

export default defineConfig({
  output: '.planning',
  framework: 'auto',
  language: 'en',
  generators: {
    pages: true,
    components: true,
    apiRoutes: true,
    lib: true,
    schemaXref: true,
    componentGraph: true,
    dependencyMap: true,
  },
  exclude: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  schema: {
    provider: 'auto',
  },
  ai: {
    generateClaudeMd: false,
    generateCursorRules: false,
    generateCopilotInstructions: false,
  },
});
`;

    await writeFile(configPath, configContent, 'utf-8');
    console.log(chalk.green('  Created fondamenta.config.ts'));
  });

program.parse();

// --- Helpers ---

async function loadConfig(
  projectRoot: string,
  opts: Record<string, unknown>,
): Promise<FondamentaConfig> {
  const config = { ...DEFAULT_CONFIG };

  // Override from CLI options
  if (opts.output) config.output = opts.output as string;
  if (opts.framework) config.framework = opts.framework as any;
  if (opts.schema === false) config.schema.provider = 'none';

  return config;
}

async function getProjectName(projectRoot: string): Promise<string> {
  try {
    const pkgPath = resolve(projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      return pkg.name || basename(projectRoot);
    }
  } catch {
    // ignore
  }
  return basename(projectRoot);
}

// Public API for config files
export function defineConfig(config: Partial<FondamentaConfig>): FondamentaConfig {
  return { ...DEFAULT_CONFIG, ...config };
}
