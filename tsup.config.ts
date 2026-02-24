import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    sourcemap: true,
    clean: true,
    target: 'node18',
    banner: { js: '#!/usr/bin/env node' },
    noExternal: [],
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
  },
]);
