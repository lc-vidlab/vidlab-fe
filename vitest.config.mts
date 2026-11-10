import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig의 @/* → src/* 와 같게
      '@': fromRoot('./src'),
      // 'server-only'는 서버 컴포넌트 밖에서 import하면 에러를 던진다. 테스트에서는 빈 모듈로 바꾼다
      'server-only': fromRoot('./node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // mock 응답 지연 없이 바로 돌려준다
      MOCK_DELAY_MS: '0',
    },
  },
});
