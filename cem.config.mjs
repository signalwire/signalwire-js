export default {
  globs: ['packages/web-components/src/**/*.ts'],
  exclude: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
  ],
  outdir: 'dev-docs/web-components-cem',
  packagejson: false,
};