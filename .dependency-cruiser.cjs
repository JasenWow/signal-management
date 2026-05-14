/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-layer-reverse',
      comment: 'L1 foundation must not import from L2 domains or L3 pages.',
      severity: 'error',
      from: { path: '^src/foundation/' },
      to: { path: ['^src/domains/', '^src/pages/', '^@/domains/', '^@/pages/'] },
    },
    {
      name: 'no-cross-layer-reverse-L2',
      comment: 'L2 domains must not import from L3 pages.',
      severity: 'error',
      from: { path: '^src/domains/' },
      to: { path: ['^src/pages/', '^@/pages/'] },
    },
    {
      name: 'no-cross-page-imports',
      comment: 'Pages must not import from other pages.',
      severity: 'error',
      from: { path: '^src/pages/' },
      to: { path: ['^src/pages/', '^@/pages/'] },
    },
    {
      name: 'no-L0-direct-from-L2-plus',
      comment: 'Only L1 can import from L0 components/ui.',
      severity: 'warn',
      from: { path: ['^src/domains/', '^src/pages/'] },
      to: { path: '^src/components/ui/' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
  },
}
