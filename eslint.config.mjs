import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // YouTube 서비스 함수는 service.ts로만 쓴다. live.ts를 직접 쓰면 USE_MOCK을 무시하고 할당량을 쓴다 (#4)
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/youtube/**', 'src/app/dev/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/youtube/live', '**/lib/youtube/mock'],
              message: "'@/lib/youtube/service'에서 import하세요. (USE_MOCK 전환, #4)",
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
