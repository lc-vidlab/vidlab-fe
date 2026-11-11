// 영상 id 형식 검사는 공용 함수(@/lib/youtube/video-id의 isVideoId)를 쓴다.

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
