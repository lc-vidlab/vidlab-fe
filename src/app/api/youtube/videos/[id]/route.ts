// GET /api/youtube/videos/[id] → Video (영상 상세)
// id가 YouTube 형식(11자)이 아니면 YouTube를 부르지 않고 400

import { YouTubeApiError } from '@/lib/youtube/errors';
import { getVideo } from '@/lib/youtube/service';
import { isVideoId } from '@/lib/youtube/video-id';

import { respond } from '../../_lib/handler';

export function GET(_request: Request, { params }: RouteContext<'/api/youtube/videos/[id]'>) {
  return respond(async () => {
    const { id } = await params;
    if (!isVideoId(id)) throw new YouTubeApiError('BAD_REQUEST', '영상 id 형식이 아닙니다.');
    return getVideo(id);
  });
}
