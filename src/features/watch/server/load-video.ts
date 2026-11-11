import 'server-only';

import { toYouTubeApiError } from '@/lib/youtube/errors';
import { getVideo } from '@/lib/youtube/service';
import type { ApiErrorCode, Video } from '@/lib/youtube/types';

export type LoadVideoResult = { video: Video } | { error: ApiErrorCode };

/**
 * 상세 페이지용 영상 조회. 에러를 던지지 않고 코드로 돌려줘서
 * 영상 정보를 못 가져와도 플레이어와 댓글은 그대로 보여줄 수 있게 한다.
 */
export async function loadVideo(id: string): Promise<LoadVideoResult> {
  try {
    return { video: await getVideo(id) };
  } catch (err) {
    return { error: toYouTubeApiError(err).code };
  }
}
