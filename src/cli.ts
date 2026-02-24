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
import { generateClaudeMd, generateCursorRules, generateCopilotInstructions } from './generators/ai-context-generator.js';
import { saveState, computeDiff, loadState } from './utils/state.js';
import { DEFAULT_CONFIG, type FondamentaConfig } from './types/index.js';
import {
  ALL_AGENTS,
  runAgents,
  printAgentResult,
  printFindings,
  printSummary,
  generateAgentsReport,
} from './agents/index.js';

const VERSION = '0.3.0';

const program = new Command();

program
  .name('fondamenta')
  .description('Zero-dependency codebase intelligence for AI agents. Static analysis → structured Markdown.')
  .version(VERSION);

// ── ANALYZE ──────────────────────────────────────────────────────────

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

    printBanner();

    if (!existsSync(projectRoot)) {
      console.error(chalk.red(`  Error: Directory not found: ${projectRoot}`));
      process.exit(1);
    }

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

    const { graph } = result;
    printStats(graph);

    // Generate outputs
    const spinnerGen = ora('  Generating documentation...').start();

    const projectName = await getProjectName(projectRoot);
    const ctx = {
      graph: result.graph,
      projectName,
      generatedAt: new Date().toISOString().split('T')[0],
    };

    await mkdir(resolve(outputDir, 'dependencies'), { recursive: true });

    const generators = getGenerators(ctx, config, result.framework);

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

    // Save state for diff
    await saveState(outputDir, projectRoot, config, result.framework, {
      pages: graph.pages.length,
      components: graph.components.length,
      apiRoutes: graph.apiRoutes.length,
      libs: graph.libs.length,
      models: graph.schema.models.length,
      enums: graph.schema.enums.length,
    });

    spinnerGen.succeed(`  Generated ${chalk.cyan(String(filesWritten))} files → ${chalk.cyan(outputDir)}`);

    console.log('');
    console.log(chalk.green('  Done!'));
    console.log(chalk.dim(`  Output: ${outputDir}`));
    console.log('');
  });

// ── DIFF ─────────────────────────────────────────────────────────────

program
  .command('diff')
  .description('Show changes since last analysis')
  .argument('[path]', 'Project root directory', '.')
  .option('-o, --output <dir>', 'Output directory', '.planning')
  .option('--ci', 'Exit with code 1 if analysis is outdated')
  .action(async (path: string, opts: Record<string, unknown>) => {
    const projectRoot = resolve(path);
    const outputDir = resolve(projectRoot, opts.output as string);
    const ciMode = opts.ci as boolean;

    printBanner();

    const config = await loadConfig(projectRoot, opts);
    const previousState = await loadState(outputDir);

    if (!previousState) {
      console.log(chalk.yellow('  No previous analysis found. Run `fondamenta analyze` first.'));
      if (ciMode) process.exit(1);
      return;
    }

    const spinnerDiff = ora('  Computing diff...').start();
    const diff = await computeDiff(projectRoot, config, outputDir);
    spinnerDiff.stop();

    console.log(chalk.dim(`  Last analysis: ${previousState.analyzedAt}`));
    console.log(chalk.dim(`  Framework: ${previousState.framework}`));
    console.log('');

    if (!diff.isOutdated) {
      console.log(chalk.green('  ✓ Analysis is up to date'));
      console.log(chalk.dim(`    ${diff.unchanged} files unchanged`));
      console.log('');
      return;
    }

    // Show changes
    if (diff.added.length > 0) {
      console.log(chalk.green(`  + ${diff.added.length} added`));
      for (const f of diff.added.slice(0, 10)) {
        console.log(chalk.green(`    + ${f}`));
      }
      if (diff.added.length > 10) {
        console.log(chalk.dim(`    ... and ${diff.added.length - 10} more`));
      }
    }

    if (diff.modified.length > 0) {
      console.log(chalk.yellow(`  ~ ${diff.modified.length} modified`));
      for (const f of diff.modified.slice(0, 10)) {
        console.log(chalk.yellow(`    ~ ${f}`));
      }
      if (diff.modified.length > 10) {
        console.log(chalk.dim(`    ... and ${diff.modified.length - 10} more`));
      }
    }

    if (diff.removed.length > 0) {
      console.log(chalk.red(`  - ${diff.removed.length} removed`));
      for (const f of diff.removed.slice(0, 10)) {
        console.log(chalk.red(`    - ${f}`));
      }
      if (diff.removed.length > 10) {
        console.log(chalk.dim(`    ... and ${diff.removed.length - 10} more`));
      }
    }

    console.log(chalk.dim(`    ${diff.unchanged} unchanged`));
    console.log('');

    const total = diff.added.length + diff.modified.length + diff.removed.length;
    console.log(chalk.yellow(`  ⚠ Analysis is outdated (${total} changes). Run \`fondamenta analyze\` to update.`));
    console.log('');

    if (ciMode) process.exit(1);
  });

// ── WATCH ────────────────────────────────────────────────────────────

program
  .command('watch')
  .description('Watch for changes and regenerate documentation')
  .argument('[path]', 'Project root directory', '.')
  .option('-o, --output <dir>', 'Output directory', '.planning')
  .option('-d, --debounce <ms>', 'Debounce interval in ms', '500')
  .action(async (path: string, opts: Record<string, unknown>) => {
    const projectRoot = resolve(path);
    const outputDir = resolve(projectRoot, opts.output as string);
    const debounceMs = parseInt(opts.debounce as string, 10) || 500;

    printBanner();
    console.log(chalk.cyan('  Watch mode — press Ctrl+C to stop'));
    console.log('');

    const config = await loadConfig(projectRoot, opts);

    // Initial analysis
    console.log(chalk.dim('  Running initial analysis...'));
    const initialResult = await analyzeProject(projectRoot, config);
    const projectName = await getProjectName(projectRoot);

    await mkdir(resolve(outputDir, 'dependencies'), { recursive: true });
    await runGeneration(projectRoot, outputDir, config, projectName, initialResult);
    console.log(chalk.green(`  ✓ Initial analysis complete (${initialResult.totalFiles} files)`));
    console.log('');

    // Watch for changes
    const { watch } = await import('chokidar');
    const watchPatterns = [
      resolve(projectRoot, '**/*.ts'),
      resolve(projectRoot, '**/*.tsx'),
    ];
    const ignorePatterns = [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.planning/**',
    ];

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isRegenerating = false;

    const watcher = watch(watchPatterns, {
      ignored: ignorePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    const regenerate = async () => {
      if (isRegenerating) return;
      isRegenerating = true;

      const spinner = ora('  Regenerating...').start();
      try {
        const result = await analyzeProject(projectRoot, config);
        await runGeneration(projectRoot, outputDir, config, projectName, result);
        spinner.succeed(`  Regenerated (${result.totalFiles} files, ${result.duration}ms)`);
      } catch (err) {
        spinner.fail(`  Regeneration failed: ${err}`);
      }
      isRegenerating = false;
    };

    const scheduleRegeneration = (filePath: string) => {
      const rel = filePath.replace(projectRoot + '/', '');
      console.log(chalk.dim(`  Changed: ${rel}`));

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(regenerate, debounceMs);
    };

    watcher
      .on('change', scheduleRegeneration)
      .on('add', scheduleRegeneration)
      .on('unlink', scheduleRegeneration);

    console.log(chalk.dim(`  Watching ${projectRoot} (debounce: ${debounceMs}ms)`));
    console.log('');

    // Keep alive
    process.on('SIGINT', () => {
      console.log('');
      console.log(chalk.dim('  Watch mode stopped.'));
      watcher.close();
      process.exit(0);
    });
  });

// ── AI-CONTEXT ───────────────────────────────────────────────────────

program
  .command('ai-context')
  .description('Generate AI-specific context files (CLAUDE.md, .cursorrules, copilot)')
  .argument('[path]', 'Project root directory', '.')
  .option('-o, --output <dir>', 'Output directory', '.planning')
  .option('--claude', 'Generate CLAUDE.md snippet')
  .option('--cursor', 'Generate .cursorrules snippet')
  .option('--copilot', 'Generate .github/copilot-instructions.md')
  .option('--all', 'Generate all AI context files')
  .action(async (path: string, opts: Record<string, unknown>) => {
    const projectRoot = resolve(path);
    const outputDir = resolve(projectRoot, opts.output as string);

    const genClaude = opts.claude as boolean || opts.all as boolean;
    const genCursor = opts.cursor as boolean || opts.all as boolean;
    const genCopilot = opts.copilot as boolean || opts.all as boolean;

    if (!genClaude && !genCursor && !genCopilot) {
      console.log(chalk.yellow('  Specify at least one target: --claude, --cursor, --copilot, or --all'));
      return;
    }

    printBanner();

    const config = await loadConfig(projectRoot, opts);

    const spinnerAnalyze = ora('  Analyzing codebase...').start();
    const result = await analyzeProject(projectRoot, config);
    spinnerAnalyze.succeed(`  Analyzed ${chalk.cyan(String(result.totalFiles))} files`);

    const projectName = await getProjectName(projectRoot);
    const ctx = {
      graph: result.graph,
      projectName,
      generatedAt: new Date().toISOString().split('T')[0],
    };

    let generated = 0;

    if (genClaude) {
      const content = generateClaudeMd(ctx, result.framework);
      const filePath = resolve(projectRoot, 'CLAUDE.md');
      if (existsSync(filePath)) {
        // Append to existing
        const existing = await readFile(filePath, 'utf-8');
        const marker = '# Codebase Context (auto-generated by fondamenta)';
        if (existing.includes(marker)) {
          // Replace existing section
          const before = existing.substring(0, existing.indexOf(marker));
          await writeFile(filePath, before.trimEnd() + '\n\n' + content, 'utf-8');
        } else {
          await writeFile(filePath, existing.trimEnd() + '\n\n' + content, 'utf-8');
        }
        console.log(chalk.green(`  ✓ Updated CLAUDE.md`));
      } else {
        await writeFile(filePath, content, 'utf-8');
        console.log(chalk.green(`  ✓ Created CLAUDE.md`));
      }
      generated++;
    }

    if (genCursor) {
      const content = generateCursorRules(ctx, result.framework);
      const filePath = resolve(projectRoot, '.cursorrules');
      await writeFile(filePath, content, 'utf-8');
      console.log(chalk.green(`  ✓ Created .cursorrules`));
      generated++;
    }

    if (genCopilot) {
      const dir = resolve(projectRoot, '.github');
      await mkdir(dir, { recursive: true });
      const content = generateCopilotInstructions(ctx, result.framework);
      const filePath = resolve(dir, 'copilot-instructions.md');
      await writeFile(filePath, content, 'utf-8');
      console.log(chalk.green(`  ✓ Created .github/copilot-instructions.md`));
      generated++;
    }

    console.log('');
    console.log(chalk.green(`  Done! Generated ${generated} AI context files.`));
    console.log('');
  });

// ── INIT ─────────────────────────────────────────────────────────────

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

// ── AGENTS ──────────────────────────────────────────────────────────

program
  .command('agents')
  .description('Run code health agents on the project graph')
  .argument('[path]', 'Project root directory', '.')
  .option('-o, --output <dir>', 'Output directory', '.planning')
  .option('--free', 'Run only free-tier agents')
  .option('--agent <id>', 'Run a single agent by ID')
  .option('--ci', 'Exit with code 1 if errors are found')
  .option('--report', 'Generate AGENTS-REPORT.md in output directory')
  .option('--list', 'List all available agents')
  .option('--json', 'Output results as JSON')
  .option('-f, --framework <name>', 'Force framework detection')
  .action(async (path: string, opts: Record<string, unknown>) => {
    const projectRoot = resolve(path);
    const outputDir = resolve(projectRoot, opts.output as string);
    const jsonMode = opts.json as boolean;

    if (!jsonMode) {
      printBanner();
    }

    // --list: just show agents and exit
    if (opts.list) {
      if (!jsonMode) {
        console.log(chalk.dim('  Available agents:'));
        console.log('');
        for (const agent of ALL_AGENTS) {
          const tierBadge = agent.tier === 'free'
            ? chalk.green(' FREE ')
            : chalk.yellow(' PRO  ');
          console.log(`  ${tierBadge} ${chalk.bold(agent.id)}`);
          console.log(chalk.dim(`         ${agent.description}`));
        }
        console.log('');
        console.log(chalk.dim(`  ${ALL_AGENTS.filter(a => a.tier === 'free').length} free, ${ALL_AGENTS.filter(a => a.tier === 'pro').length} pro`));
        console.log('');
      }
      return;
    }

    if (!existsSync(projectRoot)) {
      console.error(chalk.red(`  Error: Directory not found: ${projectRoot}`));
      process.exit(1);
    }

    const config = await loadConfig(projectRoot, opts);

    // Analyze the project
    let startTime = Date.now();
    const spinnerAnalyze = jsonMode ? null : ora('  Analyzing codebase...').start();
    const result = await analyzeProject(projectRoot, config);
    if (spinnerAnalyze) {
      spinnerAnalyze.succeed(
        `  Analyzed ${chalk.cyan(String(result.totalFiles))} files in ${chalk.cyan(`${result.duration}ms`)}`,
      );
    }

    // Run agents
    const agentStartTime = Date.now();
    const spinnerAgents = jsonMode ? null : ora('  Running agents...').start();

    const agentOptions: { freeOnly?: boolean; agentIds?: string[] } = {};
    if (opts.free) agentOptions.freeOnly = true;
    if (opts.agent) agentOptions.agentIds = [opts.agent as string];

    const summary = runAgents(result.graph, config, agentOptions);
    const agentDuration = Date.now() - agentStartTime;
    if (spinnerAgents) {
      spinnerAgents.stop();
    }

    // JSON output mode
    if (jsonMode) {
      const jsonOutput = {
        version: VERSION,
        timestamp: new Date().toISOString(),
        summary: {
          totalFindings: summary.results.reduce((sum, r) => sum + r.findings.length, 0),
          errors: summary.errors,
          warnings: summary.warnings,
          infos: summary.infos,
          agentsRan: summary.results.filter((r) => !r.skipped).length,
          agentsSkipped: summary.results.filter((r) => r.skipped).length,
          totalDurationMs: agentDuration,
        },
        results: summary.results.map((agentResult) => ({
          agentId: agentResult.agentId,
          tier: agentResult.tier,
          skipped: agentResult.skipped,
          skipReason: agentResult.skipReason,
          durationMs: agentResult.durationMs,
          findings: agentResult.findings,
        })),
      };
      console.log(JSON.stringify(jsonOutput, null, 2));

      // CI mode: exit with error if findings include errors
      if (opts.ci && summary.errors > 0) {
        process.exit(1);
      }
      return;
    }

    console.log('');

    // Print per-agent results
    for (const agentResult of summary.results) {
      printAgentResult(agentResult, ALL_AGENTS);
    }

    // Print detailed findings (errors first, then warnings)
    const errorsAndWarnings = summary.results
      .flatMap((r) => r.findings)
      .filter((f) => f.severity === 'error' || f.severity === 'warning');
    printFindings(errorsAndWarnings);

    // Print summary line
    console.log('');
    printSummary(summary);
    console.log('');

    // Generate report if requested
    if (opts.report) {
      await mkdir(outputDir, { recursive: true });
      const reportPath = resolve(outputDir, 'AGENTS-REPORT.md');
      const reportContent = generateAgentsReport(summary, ALL_AGENTS);
      await writeFile(reportPath, reportContent, 'utf-8');
      console.log(chalk.green(`  Report saved to ${reportPath}`));
      console.log('');
    }

    // CI mode: exit with error if findings include errors
    if (opts.ci && summary.errors > 0) {
      process.exit(1);
    }
  });

program.parse();

// ── HELPERS ──────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(chalk.bold('  FONDAMENTA'));
  console.log(chalk.dim(`  v${VERSION} — Zero-dependency codebase intelligence`));
  console.log('');
}

function printStats(graph: import('./types/index.js').ProjectGraph) {
  console.log('');
  console.log(chalk.dim('  Found:'));
  console.log(chalk.dim(`    ${graph.pages.length} pages`));
  console.log(chalk.dim(`    ${graph.components.length} components/hooks`));
  console.log(chalk.dim(`    ${graph.apiRoutes.length} API routes`));
  console.log(chalk.dim(`    ${graph.libs.length} lib files`));
  console.log(chalk.dim(`    ${graph.schema.models.length} DB models, ${graph.schema.enums.length} enums`));
  console.log('');
}

function getGenerators(
  ctx: { graph: import('./types/index.js').ProjectGraph; projectName: string; generatedAt: string },
  config: FondamentaConfig,
  framework: import('./types/index.js').Framework,
) {
  return [
    { name: 'pages', fn: () => generatePages(ctx), path: 'dependencies/pages-atomic.md', enabled: config.generators.pages },
    { name: 'components', fn: () => generateComponents(ctx), path: 'dependencies/components-atomic.md', enabled: config.generators.components },
    { name: 'api-routes', fn: () => generateApiRoutes(ctx), path: 'dependencies/api-routes-atomic.md', enabled: config.generators.apiRoutes },
    { name: 'lib', fn: () => generateLib(ctx), path: 'dependencies/lib-atomic.md', enabled: config.generators.lib },
    { name: 'schema', fn: () => generateSchema(ctx), path: 'dependencies/schema-crossref-atomic.md', enabled: config.generators.schemaXref },
    { name: 'component-graph', fn: () => generateComponentGraph(ctx), path: 'dependencies/component-graph.md', enabled: config.generators.componentGraph },
    { name: 'dependency-map', fn: () => generateDependencyMap(ctx, framework), path: 'DEPENDENCY-MAP.md', enabled: config.generators.dependencyMap },
  ];
}

async function runGeneration(
  projectRoot: string,
  outputDir: string,
  config: FondamentaConfig,
  projectName: string,
  result: import('./analyzers/project-analyzer.js').AnalysisResult,
) {
  const ctx = {
    graph: result.graph,
    projectName,
    generatedAt: new Date().toISOString().split('T')[0],
  };

  const generators = getGenerators(ctx, config, result.framework);

  for (const gen of generators) {
    if (!gen.enabled) continue;
    const content = gen.fn();
    if (content) {
      const filePath = resolve(outputDir, gen.path);
      await writeFile(filePath, content, 'utf-8');
    }
  }

  await saveState(outputDir, projectRoot, config, result.framework, {
    pages: result.graph.pages.length,
    components: result.graph.components.length,
    apiRoutes: result.graph.apiRoutes.length,
    libs: result.graph.libs.length,
    models: result.graph.schema.models.length,
    enums: result.graph.schema.enums.length,
  });
}

async function loadConfig(
  _projectRoot: string,
  opts: Record<string, unknown>,
): Promise<FondamentaConfig> {
  const config = { ...DEFAULT_CONFIG };

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

export function defineConfig(config: Partial<FondamentaConfig>): FondamentaConfig {
  return { ...DEFAULT_CONFIG, ...config };
}
