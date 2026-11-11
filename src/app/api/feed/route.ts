import { loadFeedPage } from '@/features/feed/load-feed';
import { toYouTubeApiError, YouTubeApiError } from '@/lib/youtube/errors';
import { isMockMode } from '@/lib/youtube/mode';

const REGION_PATTERN = /^[A-Z]{2}$/;
const CATEGORY_PATTERN = /^\d{1,4}$/;
const MAX_PAGE_TOKEN_LENGTH = 500;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const regionCode = (params.get('regionCode') ?? 'KR').trim().toUpperCase();
  const categoryId = params.get('categoryId')?.trim() || undefined;
  const pageToken = params.get('pageToken')?.trim() || undefined;

  try {
    if (!REGION_PATTERN.test(regionCode)) {
      throw new YouTubeApiError('BAD_REQUEST', '올바른 국가 코드를 입력해 주세요.');
    }
    if (categoryId && !CATEGORY_PATTERN.test(categoryId)) {
      throw new YouTubeApiError('BAD_REQUEST', '올바른 카테고리를 선택해 주세요.');
    }
    if (pageToken && pageToken.length > MAX_PAGE_TOKEN_LENGTH) {
      throw new YouTubeApiError('BAD_REQUEST', '페이지 토큰이 너무 깁니다.');
    }

    return Response.json(
      await loadFeedPage({ mock: isMockMode(), regionCode, categoryId, pageToken }),
    );
  } catch (error) {
    const apiError = toYouTubeApiError(error);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}
