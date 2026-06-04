import eslint from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import prettierPlugin from 'eslint-plugin-prettier';
import sortClassMembers from 'eslint-plugin-sort-class-members';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.changeset/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/playwright-report/**',
      '**/test-results/**',
      'playground/**',
      'packages/web-components/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './packages/main/tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: fixupPluginRules(importPlugin),
      jsdoc: jsdocPlugin,
      prettier: prettierPlugin,
      'sort-class-members': fixupPluginRules(sortClassMembers),
      'unused-imports': unusedImportsPlugin
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false
        }
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false
        }
      ],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid'
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase']
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false
          }
        }
      ],

      // Import organization rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type'
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/no-cycle': [
        'error',
        {
          maxDepth: 10,
          ignoreExternal: true,
          allowUnsafeDynamicCyclicDependency: false
        }
      ],
      'import/no-self-import': 'error',
      'import/newline-after-import': 'error',

      // Code quality rules
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error']
        }
      ],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': [
        'warn',
        {
          array: false,
          object: true
        }
      ],
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['draft', 'state']
        }
      ],
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Best practices
      'no-throw-literal': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-unused-expressions': 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      'no-fallthrough': 'error',
      'no-duplicate-imports': 'off', // Handled by import plugin
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration:not([const=true])',
          message: 'Prefer const enums for better tree-shaking'
        }
      ],

      // Class organization
      'sort-class-members/sort-class-members': [
        'error',
        {
          order: [
            '[static-properties]',
            '[static-methods]',
            '[properties]',
            '[conventional-private-properties]',
            'constructor',
            '[methods]',
            '[conventional-private-methods]'
          ],
          accessorPairPositioning: 'getThenSet'
        }
      ],

      // JSDoc documentation rules
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/no-blank-blocks': 'warn',
      'jsdoc/check-tag-names': [
        'warn',
        {
          definedTags: ['internal', 'fires', 'cssprop', 'csspart', 'slot']
        }
      ],

      // Code complexity
      complexity: ['warn', 30],
      'max-depth': ['warn', 4],
      'max-lines': [
        'warn',
        {
          max: 1000,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 150,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      'max-params': ['warn', 15]
    }
  },

  // JSDoc presence enforcement — public API files only
  {
    files: [
      'packages/main/src/clients/**/*.ts',
      'packages/main/src/core/entities/**/*.ts',
      'packages/main/src/core/types/**/*.ts',
      'packages/main/src/interfaces/**/*.ts',
      'packages/main/src/dependencies/**/*.ts',
      'packages/main/src/operators/**/*.ts',
      'packages/main/src/managers/DirectoryManager.ts'
    ],
    plugins: {
      jsdoc: jsdocPlugin
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          require: {
            ClassDeclaration: true,
            MethodDefinition: false,
            FunctionDeclaration: true
          },
          contexts: [
            'ExportNamedDeclaration > TSTypeAliasDeclaration',
            'ExportNamedDeclaration > TSInterfaceDeclaration'
          ],
          checkGetters: true,
          checkSetters: true
        }
      ],
      'jsdoc/require-description': [
        'warn',
        {
          contexts: ['ClassDeclaration', 'TSInterfaceDeclaration', 'TSTypeAliasDeclaration']
        }
      ]
    }
  },

  // Prettier config last to override conflicting rules
  prettierConfig
);
