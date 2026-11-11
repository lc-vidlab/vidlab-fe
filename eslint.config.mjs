import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // 서비스 진입점(service.ts)만 쓰게 한다. 같은 규칙(no-restricted-imports)을 설정 블록 둘에 나눠 쓰면
    // 뒤 블록이 앞 블록을 덮어써서 한 블록에 모은다.
    // - YouTube: live.ts를 직접 쓰면 USE_MOCK을 무시하고 할당량을 쓴다 (#4)
    // - 댓글: postgres.ts · mock.ts를 직접 쓰면 COMMENTS_USE_MOCK 전환 · 입력 검사 · 해시를 건너뛴다 (#19)
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/youtube/**', 'src/lib/comments/**', 'src/app/dev/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/youtube/live', '**/lib/youtube/mock'],
              message: "'@/lib/youtube/service'에서 import하세요. (USE_MOCK 전환, #4)",
            },
            {
              group: ['**/lib/comments/postgres', '**/lib/comments/mock'],
              message: "'@/lib/comments/service'에서 import하세요. (COMMENTS_USE_MOCK 전환, #19)",
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
