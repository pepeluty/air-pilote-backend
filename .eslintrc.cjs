// ESLint config — Air-Pilote backend
// Enforces hexagonal/DDD layer boundaries per design Decision #8
// (no-restricted-imports: domain -> none, application -> domain, infrastructure -> all).
//
// ESLint 8 with legacy .eslintrc config (compatible with @typescript-eslint v7).

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.spec.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '*.js', '*.cjs'],
  rules: {
    // Common safety + style. Framework import restrictions are applied per
    // layer via overrides below (Decision #8: domain -> none, application ->
    // domain, infrastructure -> all, bootstrap files unrestricted).
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
  overrides: [
    // --- DOMAIN layer: no framework, no infrastructure, no application ---
    // Matches both context-specific domain (src/contexts/**/domain/**) and the
    // shared domain base (src/shared/domain/**). Domain may only depend on
    // shared/domain and itself.
    {
      files: [
        'src/**/domain/**/*.ts',
        'src/shared/domain/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@nestjs/*', '@mikro-orm/*'],
                message:
                  'Domain layer MUST NOT import from @nestjs/* or @mikro-orm/* (framework leakage).',
              },
              {
                group: ['**/infrastructure/**', '../infrastructure/**', '../../infrastructure/**'],
                message:
                  'Domain layer MUST NOT import from infrastructure (inverse dependency).',
              },
              {
                group: ['**/application/**', '../application/**', '../../application/**'],
                message:
                  'Domain layer MUST NOT import from application (inverse dependency).',
              },
            ],
          },
        ],
      },
    },
    // --- APPLICATION layer: no framework, no infrastructure ---
    // May depend on domain + shared (ports live here).
    {
      files: [
        'src/**/application/**/*.ts',
        'src/shared/application/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@nestjs/*', '@mikro-orm/*'],
                message:
                  'Application layer MUST NOT import from @nestjs/* or @mikro-orm/* (framework leakage). Use ports instead.',
              },
              {
                group: ['**/infrastructure/**', '../infrastructure/**', '../../infrastructure/**'],
                message:
                  'Application layer MUST NOT import from infrastructure (inverse dependency).',
              },
            ],
          },
        ],
      },
    },
    // --- SHARED kernel framework-agnostic zone ---
    // Pure ports (UserExists, TokenVerifier) and the typed domain errors MUST
    // stay free of @nestjs/* and @mikro-orm/*. Files that are legitimate
    // NestJS adapters living alongside the shared kernel (AuthGuard,
    // DomainExceptionFilter) are exempted in the next override block.
    {
      files: ['src/shared/**/*.ts'],
      excludedFiles: [
        'src/shared/**/*.spec.ts',
        'src/shared/infrastructure/**',
        'src/shared/AuthGuard.ts',
        'src/shared/DomainExceptionFilter.ts',
      ],
      rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@nestjs/*', '@mikro-orm/*'],
                message:
                  'Shared-kernel ports, errors, and base classes MUST stay framework-agnostic (no @nestjs/* or @mikro-orm/*).',
              },
              {
                group: ['**/infrastructure/**', '../infrastructure/**', '../../infrastructure/**'],
                message:
                  'Shared kernel MUST NOT import from infrastructure (inverse dependency).',
              },
              {
                group: ['**/infrastructure/*', '../infrastructure', '../infrastructure/*'],
                message:
                  'Shared kernel MUST NOT import from infrastructure (inverse dependency).',
              },
            ],
          },
        ],
      },
    },
    // --- Shared-kernel NestJS adapters (infrastructure-tier, framework allowed) ---
    // The global AuthGuard and DomainExceptionFilter are NestJS adapters that
    // live in shared/ for cross-context reuse; they may import @nestjs/*.
    {
      files: ['src/shared/AuthGuard.ts', 'src/shared/DomainExceptionFilter.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};