import { cacheLife } from 'next/cache';
import { toFeedVideo } from '@/features/feed/load-feed';
import { toYouTubeApiError, YouTubeApiError } from '@/lib/youtube/errors';
import { getVideo, getVideoCategories } from '@/lib/youtube/service';

async function loadVideo(id: string) {
  'use cache';
  cacheLife('hours');
  const [video, categories] = await Promise.all([getVideo(id), getVideoCategories()]);
  return toFeedVideo(video, categories);
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim();
  try {
    if (!id || id.length > 100) throw new YouTubeApiError('BAD_REQUEST', '영상 ID가 필요합니다.');
    return Response.json(await loadVideo(id));
  } catch (error) {
    const apiError = toYouTubeApiError(error);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}
