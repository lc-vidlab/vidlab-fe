// GET /api/youtube/categories → VideoCategory[] (카테고리 칩)

import { getVideoCategories } from '@/lib/youtube/service';

import { respond } from '../_lib/handler';

export function GET() {
  return respond(() => getVideoCategories());
}
