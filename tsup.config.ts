import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'core/main': 'src/core/export/main.ts', 
  },
  format: ['esm'],
  bundle: true,
  platform: 'node',
  target: 'es2022',
  sourcemap: false,
  minify: true,
  splitting: false,
  treeshake: true,
  external: [
    /^[^./]/, 
  ],
  esbuildOptions(options) {
    options.packages = 'external';
    options.legalComments = 'none'; 
    options.logLevel = 'info'; 
  },
});