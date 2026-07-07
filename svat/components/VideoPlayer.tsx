"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSecurityEventType } from "@/lib/types";

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          host?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onStateChange?: (event: { data: number }) => void;
            onReady?: () => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
}

interface VideoPlayerProps {
  videoId?: string;
  secureUrl?: string;
  watermarkText?: string;
  onSecurityEvent?: (
    eventType: UserSecurityEventType,
    context?: Record<string, unknown>,
  ) => void;
  onComplete?: () => void;
  onProgress?: (percent: number) => void;
}

let apiReadyPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existing) {
      window.onYouTubeIframeAPIReady = () => resolve();
      return;
    }

    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  });

  return apiReadyPromise;
}

export default function VideoPlayer({
  videoId,
  secureUrl,
  watermarkText,
  onSecurityEvent,
  onComplete,
  onProgress,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef<VideoPlayerProps["onComplete"]>(onComplete);
  const onProgressRef = useRef<VideoPlayerProps["onProgress"]>(onProgress);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (secureUrl) return;
    completedRef.current = false;
    let mounted = true;

    async function initPlayer() {
      if (!videoId) return;
      await loadYouTubeAPI();
      if (!mounted || !containerRef.current || !window.YT?.Player) return;

      playerRef.current?.destroy();
      containerRef.current.innerHTML = "";

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.ENDED) {
              handleComplete();
            }
          },
          onReady: () => {
            if (!playerRef.current) return;
            setDuration(playerRef.current.getDuration() || 0);

            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            progressIntervalRef.current = setInterval(() => {
              if (!playerRef.current) return;
              const current = playerRef.current.getCurrentTime();
              const duration = playerRef.current.getDuration();
              setCurrentTime(current || 0);
              setDuration(duration || 0);
              if (duration > 0) {
                const percent = (current / duration) * 100;
                onProgressRef.current?.(percent);
                if (percent >= 90) {
                  handleComplete();
                }
              }
            }, 5000);
          },
        },
      });
    }

    initPlayer();

    return () => {
      mounted = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, secureUrl, handleComplete]);

  useEffect(() => {
    if (!secureUrl) return;
    completedRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    progressIntervalRef.current = setInterval(() => {
      const video = nativeVideoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const current = video.currentTime;
      const total = video.duration;
      setCurrentTime(current);
      setDuration(total);
      const percent = (current / total) * 100;
      onProgressRef.current?.(percent);
      if (percent >= 90) {
        handleComplete();
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [secureUrl, handleComplete]);

  const handleTogglePlay = useCallback(() => {
    if (secureUrl) {
      const video = nativeVideoRef.current;
      if (!video) return;
      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
      return;
    }
    if (!playerRef.current || !window.YT?.PlayerState) return;
    const state = playerRef.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [secureUrl]);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    container.requestFullscreen?.().catch(() => {});
  }, []);

  const blockEvent = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const triggerCaptureBlock = useCallback(
    (eventType: UserSecurityEventType, context?: Record<string, unknown>) => {
    setCaptureBlocked(true);
    if (secureUrl) {
      nativeVideoRef.current?.pause();
    } else {
      playerRef.current?.pauseVideo();
    }
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    captureTimeoutRef.current = setTimeout(() => {
      setCaptureBlocked(false);
    }, 8000);
      onSecurityEvent?.(eventType, context);
    },
    [secureUrl, onSecurityEvent],
  );

  useEffect(() => {
    const shouldBlockCaptureShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const printLikeKey = key === "printscreen" || key === "snapshot";
      const macShot = event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key);
      const windowsSnip = event.shiftKey && key === "s" && (event.metaKey || event.ctrlKey);
      const altPrint = event.altKey && printLikeKey;
      return printLikeKey || macShot || windowsSnip || altPrint;
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockCaptureShortcut(event)) {
        event.preventDefault();
        triggerCaptureBlock("screenshot_attempt", {
          key: event.key,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        });
      }
    };

    const handleGlobalKeyUp = (event: KeyboardEvent) => {
      if (shouldBlockCaptureShortcut(event)) {
        event.preventDefault();
        triggerCaptureBlock("screenshot_attempt", {
          key: event.key,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        });
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        onSecurityEvent?.("visibility_hidden");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("keyup", handleGlobalKeyUp);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("keyup", handleGlobalKeyUp);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }
    };
  }, [triggerCaptureBlock, onSecurityEvent]);

  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const printLikeKey = key === "printscreen" || key === "snapshot";
    const macShot = event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key);
    const windowsSnip = event.shiftKey && key === "s" && (event.metaKey || event.ctrlKey);
    const altPrint = event.altKey && printLikeKey;
    if (printLikeKey || macShot || windowsSnip || altPrint) {
      event.preventDefault();
      triggerCaptureBlock("screenshot_attempt", {
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      });
      return;
    }

    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    if (!isCtrlOrMeta) return;

    if (key === "c" || key === "x" || key === "u" || key === "s") {
      event.preventDefault();
    }
  }, [triggerCaptureBlock]);

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (secureUrl) {
      const video = nativeVideoRef.current;
      if (!video) return;
      const nextTime = Number(event.target.value);
      if (!Number.isFinite(nextTime)) return;
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      return;
    }
    if (!playerRef.current) return;
    const nextTime = Number(event.target.value);
    if (!Number.isFinite(nextTime)) return;
    playerRef.current.seekTo(nextTime, true);
    setCurrentTime(nextTime);
  }, [secureUrl]);

  return (
    <div
      className="relative h-full w-full select-none"
      onContextMenu={blockEvent}
      onCopy={blockEvent}
      onCut={blockEvent}
      onDragStart={blockEvent}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {secureUrl ? (
        <video
          ref={nativeVideoRef}
          className="h-full w-full"
          controls={false}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          onEnded={handleComplete}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          playsInline
          src={secureUrl}
        />
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center overflow-hidden"
      >
        <div
          className="rotate-[-24deg] text-xl font-bold tracking-[0.25em] text-white/30"
        >
          {(watermarkText || "ONE TRADERS SECURED CONTENT") + " • "}
          {(watermarkText || "ONE TRADERS SECURED CONTENT") + " • "}
          {(watermarkText || "ONE TRADERS SECURED CONTENT")}
        </div>
      </div>
      {captureBlocked && (
        <div className="absolute inset-0 z-[30] flex items-center justify-center bg-black">
          <span className="text-sm font-semibold tracking-wider text-white/80">
            Screen capture blocked by ONETRADERS
          </span>
        </div>
      )}
      <div className="absolute inset-0 z-[5]" aria-hidden="true" />
      <div className="absolute inset-x-4 bottom-4 z-10 flex items-center gap-3 rounded-lg bg-black/60 px-3 py-2 text-white backdrop-blur-sm">
        <span className="w-20 text-xs tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          aria-label="Video progress"
          className="h-1 w-full cursor-pointer accent-red-500"
          max={duration || 0}
          min={0}
          onChange={handleSeek}
          step={1}
          type="range"
          value={Math.min(currentTime, duration || 0)}
        />
        <button
          aria-label={isPlaying ? "Pause video" : "Play video"}
          className="rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
          onClick={handleTogglePlay}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>
        <button
          aria-label="Toggle fullscreen"
          className="rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
          onClick={handleFullscreen}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">fullscreen</span>
        </button>
      </div>
    </div>
  );
}
