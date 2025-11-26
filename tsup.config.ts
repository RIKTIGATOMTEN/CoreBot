import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/main': 'src/core/export/main.ts',
  },
  format: ['esm'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  splitting: true, // code splitting enabled
  sourcemap: false,
  minify: 'terser',
  treeshake: {
    preset: 'smallest',
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: false,
  },
  external: [/^[^.\/]/], // keep node_modules external
  esbuildOptions(options) {
    options.packages = 'external';
    options.legalComments = 'none';
    options.logLevel = 'silent';
    options.treeShaking = true;
    options.ignoreAnnotations = false;
    options.mangleProps = /^_/;
    options.minifyWhitespace = true;
    options.minifyIdentifiers = true;
    options.minifySyntax = true;
    options.keepNames = false;
    options.platform = 'node';
    options.charset = 'utf8';
    options.dropLabels = ['DEV', 'TEST'];
    options.chunkNames = 'core/compiled/chunk-[hash]'; // put chunks in core/compiled
  },
  outExtension() {
    return { js: '.js' };
  },
  terserOptions: {
    compress: {
      passes: 4,
      ecma: 2020,
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_math: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_methods: true,
      unsafe_arrows: true,
      unsafe_undefined: true,
      drop_console: false,
      drop_debugger: true,
      dead_code: true,
      unused: true,
      keep_fargs: false,
      keep_fnames: false,
      arguments: true,
      booleans_as_integers: false, // This will break some Logic, keep it disabled
      collapse_vars: true,
      comparisons: true,
      computed_props: true,
      conditionals: true,
      evaluate: true,
      hoist_funs: true,
      hoist_props: true,
      hoist_vars: false,
      if_return: true,
      inline: 3,
      join_vars: true,
      loops: true,
      negate_iife: true,
      properties: true,
      reduce_funcs: true,
      reduce_vars: true,
      sequences: true,
      side_effects: true,
      switches: true,
      toplevel: true,
      typeofs: true,
    },
    mangle: {
      properties: {
        regex: /^_/,
        reserved: ['main', 'fileMustExist', 'readonly', 'verbose', 'nativeBinding'],
      },
      toplevel: true,
      eval: true,
      keep_fnames: false,
      keep_classnames: false,
      module: true,
      safari10: false,
    },
    format: {
      comments: false,
      ecma: 2020,
      ascii_only: false,
      webkit: false,
      wrap_func_args: false,
      shebang: true,
    },
    module: true,
    toplevel: true,
  },
  clean: false,
  skipNodeModulesBundle: true,
  noExternal: [],
  env: {
    NODE_ENV: 'production',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
