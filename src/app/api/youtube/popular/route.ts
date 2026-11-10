import { loadFeedPage } from '@/features/feed/load-feed';
import { toYouTubeApiError, YouTubeApiError } from '@/lib/youtube/errors';
import { isMockMode } from '@/lib/youtube/mode';

const REGION_PATTERN = /^[A-Z]{2}$/;
const CATEGORY_PATTERN = /^\d+$/;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const regionCode = (params.get('regionCode') ?? 'KR').toUpperCase();
  const categoryId = params.get('categoryId') || undefined;
  const pageToken = params.get('pageToken') || undefined;

  try {
    if (!REGION_PATTERN.test(regionCode)) {
      throw new YouTubeApiError('BAD_REQUEST', '올바른 국가 코드를 입력하세요.');
    }
    if (categoryId && !CATEGORY_PATTERN.test(categoryId)) {
      throw new YouTubeApiError('BAD_REQUEST', '올바른 카테고리를 선택하세요.');
    }
    return Response.json(
      await loadFeedPage({ mock: isMockMode(), regionCode, categoryId, pageToken }),
    );
  } catch (error) {
    const apiError = toYouTubeApiError(error);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}
