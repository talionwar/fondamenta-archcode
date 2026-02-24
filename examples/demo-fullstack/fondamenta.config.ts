import { defineConfig } from 'fondamenta';

export default defineConfig({
  output: '.planning',
  framework: 'nextjs-app',
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
  exclude: ['**/node_modules/**', '**/.next/**', '**/nuxt-app/**'],
  schema: { provider: 'auto' },
  agents: {
    enabled: true,
    thresholds: {
      maxLineCount: 400,
      maxDependencies: 12,
      maxPageImports: 15,
      maxApiCallsPerPage: 3,
    },
  },
});
