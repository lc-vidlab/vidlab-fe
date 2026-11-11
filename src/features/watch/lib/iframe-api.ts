/**
 * YouTube IFrame Player API 로더와 최소 타입 정의
 * https://developers.google.com/youtube/iframe_api_reference
 */

export type PlayerErrorCode = 2 | 5 | 100 | 101 | 150;

export type IframePlayer = {
  destroy(): void;
  getIframe(): HTMLIFrameElement;
};

type PlayerOptions = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: IframePlayer }) => void;
    onError?: (e: { target: IframePlayer; data: PlayerErrorCode }) => void;
  };
};

type IframeApi = {
  Player: new (el: HTMLElement, options: PlayerOptions) => IframePlayer;
};

declare global {
  interface Window {
    YT?: IframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api';
let loading: Promise<IframeApi> | null = null;

/** 스크립트는 한 번만 넣고, 여러 플레이어가 같은 Promise를 공유 */
export function loadIframeApi(): Promise<IframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;

  loading = new Promise<IframeApi>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('IFrame Player API를 초기화하지 못했어요.'));
    };

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      loading = null; // 다음 시도에서 다시 로드
      script.remove();
      reject(new Error('IFrame Player API 스크립트를 불러오지 못했어요.'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
