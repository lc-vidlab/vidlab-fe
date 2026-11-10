import { describe, expect, it } from 'vitest';

import { countChars, validateCommentInput } from './rules';
import type { CommentInput } from './types';

const VALID: CommentInput = { nickname: '영상러버', password: '1234', content: '좋은 영상이네요' };

function validate(patch: Partial<CommentInput>) {
  return validateCommentInput({ ...VALID, ...patch });
}

function errorsOf(patch: Partial<CommentInput>) {
  const result = validate(patch);
  return result.ok ? {} : result.errors;
}

function valueOf(patch: Partial<CommentInput>): CommentInput {
  const result = validate(patch);
  if (!result.ok) throw new Error(`통과해야 함: ${JSON.stringify(result.errors)}`);
  return result.value;
}

// 문자 코드로 적어 둔다 (소스에 보이지 않는 문자를 직접 넣지 않기 위해)
const HANGUL_FILLER = 'ㅤ';
const ZERO_WIDTH_SPACE = '​';
const RTL_OVERRIDE = '‮';
const NBSP = ' ';
const ZWJ = '‍';
const FAMILY = `\u{1F468}${ZWJ}\u{1F469}${ZWJ}\u{1F467}`;
/** NFD로 쓴 '가' (ㄱ + ㅏ) */
const NFD_GA = '가';

describe('countChars', () => {
  it('이모지를 1자로 센다', () => {
    expect(countChars('😀😀')).toBe(2);
    expect('😀😀'.length).toBe(4);
  });
});

describe('validateCommentInput', () => {
  it('정상 입력은 통과한다', () => {
    expect(validate({})).toEqual({ ok: true, value: VALID });
  });

  describe('닉네임', () => {
    it.each([
      ['2자', '가나'],
      ['12자', '가'.repeat(12)],
      ['가운데 공백', '영상 러버'],
      ['이모지 2자', '😀😀'],
    ])('받음: %s', (_, nickname) => {
      expect(errorsOf({ nickname })).toEqual({});
    });

    it.each([
      ['1자', '가'],
      ['13자', '가'.repeat(13)],
      ['공백뿐', '   '],
      ['이모지 13자', '😀'.repeat(13)],
    ])('글자 수 오류: %s', (_, nickname) => {
      expect(errorsOf({ nickname }).nickname).toBe('닉네임은 2~12자로 입력해 주세요.');
    });

    it.each([
      ['한글 채움 문자만', HANGUL_FILLER.repeat(3)],
      ['제로폭 공백', `닉${ZERO_WIDTH_SPACE}네임`],
      ['방향 바꾸기 문자', `${RTL_OVERRIDE}닉네임`],
      ['가운데 탭', '닉\t네임'],
      ['가운데 줄바꿈', '닉\n네임'],
      ['NUL', '닉\u0000네임'],
      ['짝 없는 서로게이트', '닉\uD800네임'],
    ])('쓸 수 없는 문자: %s', (_, nickname) => {
      expect(errorsOf({ nickname }).nickname).toBe('닉네임에 쓸 수 없는 문자가 있어요.');
    });

    it('앞뒤 공백(NBSP 포함)을 지운다', () => {
      expect(valueOf({ nickname: ` ${NBSP}영상러버\t ` }).nickname).toBe('영상러버');
    });

    it('NFD 한글을 NFC로 바꿔 글자 수를 센다', () => {
      // NFD '가' 12개 = 코드 포인트 24개지만 NFC로는 12자
      const nickname = NFD_GA.repeat(12);
      expect(valueOf({ nickname }).nickname).toBe('가'.repeat(12));
    });
  });

  describe('비밀번호', () => {
    it.each([
      ['4자', '1234'],
      ['20자', 'a'.repeat(20)],
      ['앞뒤 공백 포함', ' 12 '],
    ])('받음: %s', (_, password) => {
      expect(errorsOf({ password })).toEqual({});
    });

    it('앞뒤 공백을 지우지 않는다', () => {
      expect(valueOf({ password: ' 12 ' }).password).toBe(' 12 ');
    });

    it('NFC로 맞춘다 (맥 · 윈도에서 같은 해시)', () => {
      expect(valueOf({ password: `${NFD_GA}1234` }).password).toBe('가1234');
    });

    it.each([
      ['3자', '123'],
      ['21자', 'a'.repeat(21)],
    ])('글자 수 오류: %s', (_, password) => {
      expect(errorsOf({ password }).password).toBe('비밀번호는 4~20자로 입력해 주세요.');
    });

    it('제어 문자는 거부한다', () => {
      expect(errorsOf({ password: '12\n34' }).password).toBe(
        '비밀번호에 쓸 수 없는 문자가 있어요.',
      );
    });

    it('bcrypt 한도(72바이트)를 넘으면 거부한다', () => {
      // 이모지 19자 = 76바이트
      expect(errorsOf({ password: '😀'.repeat(19) }).password).toBe('비밀번호가 너무 길어요.');
      // 한글 20자 = 60바이트
      expect(errorsOf({ password: '가'.repeat(20) })).toEqual({});
    });
  });

  describe('내용', () => {
    it.each([
      ['1자', '가'],
      ['500자', '가'.repeat(500)],
      ['이모지 500자', '😀'.repeat(500)],
      ['줄바꿈 · 탭', '첫 줄\n\t둘째 줄'],
      ['ZWJ로 이은 가족 이모지', `가족 ${FAMILY}`],
    ])('받음: %s', (_, content) => {
      expect(errorsOf({ content })).toEqual({});
    });

    it.each([
      ['빈 문자열', ''],
      ['공백 · 줄바꿈뿐', ' \n\t '],
      ['501자', '가'.repeat(501)],
      ['한글 채움 문자뿐', HANGUL_FILLER.repeat(3)],
      ['ZWJ뿐', ZWJ],
    ])('글자 수 오류: %s', (_, content) => {
      expect(errorsOf({ content }).content).toBe('댓글은 1~500자로 입력해 주세요.');
    });

    it.each([
      ['제로폭 공백', `내용${ZERO_WIDTH_SPACE}`],
      ['방향 바꾸기 문자', `${RTL_OVERRIDE}내용`],
      ['NUL', '내용\u0000'],
      ['짝 없는 서로게이트', '내용\uDC00'],
    ])('쓸 수 없는 문자: %s', (_, content) => {
      expect(errorsOf({ content }).content).toBe('댓글에 쓸 수 없는 문자가 있어요.');
    });

    it('줄바꿈을 \\n으로 통일하고 앞뒤 공백을 지운다', () => {
      expect(valueOf({ content: '\r\n 첫 줄\r\n둘째 줄\r셋째 줄 \n' }).content).toBe(
        '첫 줄\n둘째 줄\n셋째 줄',
      );
    });
  });

  it('여러 칸이 틀리면 칸별로 모두 알려 준다', () => {
    expect(Object.keys(errorsOf({ nickname: '', password: '', content: '' }))).toEqual([
      'nickname',
      'password',
      'content',
    ]);
  });
});
