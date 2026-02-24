# Contributing to Fondamenta ArchCode

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/talionwar/fondamenta-archcode.git
cd fondamenta-archcode
npm install
npm run build
```

## Development

```bash
npm run dev          # Watch mode (rebuild on changes)
npm run typecheck    # TypeScript check
npm run build        # Production build
```

### Testing locally

```bash
# Analyze the project itself
node dist/cli.js analyze .

# Analyze any Next.js project
node dist/cli.js analyze /path/to/project -v
```

## Project Structure

```
src/
├── cli.ts                  # CLI entry point (commander)
├── index.ts                # Public API exports
├── types/index.ts          # All TypeScript types
├── framework/detector.ts   # Auto-detect framework
├── schema/prisma-parser.ts # Prisma schema parser
├── analyzers/
│   ├── typescript-parser.ts   # TS Compiler API file parser
│   └── project-analyzer.ts    # Orchestrates full analysis
├── generators/
│   ├── base.ts                # Shared markdown helpers
│   ├── pages-generator.ts     # Pages atomic output
│   ├── components-generator.ts
│   ├── api-routes-generator.ts
│   ├── lib-generator.ts
│   ├── schema-generator.ts
│   ├── component-graph-generator.ts
│   ├── dependency-map-generator.ts
│   └── ai-context-generator.ts  # CLAUDE.md, .cursorrules, copilot
└── utils/
    └── state.ts               # File hashing for diff/watch
```

## Adding a New Generator

1. Create `src/generators/my-generator.ts`
2. Export a function: `(ctx: GeneratorContext) => string`
3. Register it in `src/cli.ts` in the `getGenerators()` function
4. Add a config toggle in `src/types/index.ts` under `generators`

## Adding Framework Support

1. Add detection signals in `src/framework/detector.ts`
2. Add route path resolution in `src/analyzers/project-analyzer.ts` (`filePathToRoute`)
3. Add file classification rules in `src/analyzers/typescript-parser.ts`

## Pull Requests

- Keep PRs focused on a single change
- Run `npm run typecheck` before submitting
- Update README if adding new commands or features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
