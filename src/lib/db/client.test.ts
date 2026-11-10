import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 연결 설정만 확인한다. postgres()는 첫 쿼리 때 접속하므로 실제 DB 없이도 실행된다.
// 실제 DB 확인은 npm run db:check (#15)

type GlobalWithDb = typeof globalThis & { vidlabDb?: { end: () => Promise<void> } };

async function loadGetDb() {
  vi.resetModules();
  return (await import('./client')).getDb;
}

beforeEach(() => {
  delete (globalThis as GlobalWithDb).vidlabDb;
});

afterEach(async () => {
  await (globalThis as GlobalWithDb).vidlabDb?.end();
  delete (globalThis as GlobalWithDb).vidlabDb;
  vi.unstubAllEnvs();
});

describe('getDb', () => {
  it('DATABASE_URL이 없으면 설정 방법을 알려 주는 에러', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const getDb = await loadGetDb();
    expect(() => getDb()).toThrow('DATABASE_URL');
  });

  it('여러 번 불러도 연결을 하나만 만든다 (모듈을 다시 읽어도)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pw@db.example.com:6543/postgres');
    const first = (await loadGetDb())();
    const second = (await loadGetDb())();
    expect(second).toBe(first);
  });

  it('Supabase 풀러용 설정: prepared statement 끔, SSL 사용', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pw@db.example.com:6543/postgres');
    const { options } = (await loadGetDb())();
    expect(options.prepare).toBe(false);
    expect(options.ssl).toBe('require');
  });

  it.each([['localhost'], ['127.0.0.1'], ['[::1]']])(
    '로컬 DB(%s)는 SSL 없이 접속한다',
    async (host) => {
      vi.stubEnv('DATABASE_URL', `postgres://user:pw@${host}:5432/postgres`);
      const { options } = (await loadGetDb())();
      expect(options.ssl).toBe(false);
    },
  );

  it('주소 형식이 잘못돼도 에러에 비밀번호가 들어가지 않는다', async () => {
    // 비밀번호의 # 때문에 URL이 깨진다
    const secret = 'pa#ss/w0rd';
    vi.stubEnv('DATABASE_URL', `postgres://user:${secret}@db.example.com:6543/postgres`);
    const getDb = await loadGetDb();

    const error = (() => {
      try {
        getDb();
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('DATABASE_URL 형식');
    // 메시지뿐 아니라 에러 객체의 모든 속성(input, cause 등)을 확인한다
    const dumped = JSON.stringify(error, Object.getOwnPropertyNames(error)) + String(error);
    expect(dumped).not.toContain('pa#ss');
    expect((error as Error).cause).toBeUndefined();
  });
});
