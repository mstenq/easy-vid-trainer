import { useState, useRef, useCallback, useEffect } from 'react';
import type { Video } from '@/types';

interface UseVideoPlayerOptions {
  video: Video;
  onVideoUpdate: (video: Video) => void;
}

export function useVideoPlayer({ video, onVideoUpdate }: UseVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState(video.id);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset state when video changes
  useEffect(() => {
    const isNewVideo = video.id !== currentVideoId;
    
    setVideoError(null);
    setVideoLoaded(false);
    setIsPlaying(false);
    
    if (isNewVideo) {
      setCurrentTime(video.startTime || 0);
      setCurrentVideoId(video.id);
      setPendingSeekTime(null);
    }
    
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Set a loading timeout
    const timeout = setTimeout(() => {
      if (!videoLoaded) {
        setVideoError('Video loading timed out. Please try refreshing the page.');
      }
    }, 10000);
    
    setLoadingTimeout(timeout);
    
    // Force video element to reload when video changes
    if (videoRef.current) {
      videoRef.current.load();
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [video.id, video.startTime]); // Remove currentVideoId, videoLoaded, loadingTimeout from dependencies

  const handlePlayPause = useCallback(async () => {
    if (videoRef.current && videoLoaded) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error playing video:', error);
        setVideoError(`Playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsPlaying(false);
      }
    } else if (!videoLoaded) {
      setVideoError('Video not loaded yet. Please wait or check if the video file exists.');
    }
  }, [videoRef, videoLoaded, isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    // If we have a pending seek time, seek to it first
    if (pendingSeekTime !== null && videoRef.current) {
      videoRef.current.currentTime = pendingSeekTime;
      setCurrentTime(pendingSeekTime);
      setPendingSeekTime(null);
    } else if (video.startTime > 0 && videoRef.current) {
      // If video has a start time set, seek to it automatically
      videoRef.current.currentTime = video.startTime;
      setCurrentTime(video.startTime);
    } else {
      handleTimeUpdate();
    }
    
    setVideoLoaded(true);
    setVideoError(null);
    
    // Clear loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [pendingSeekTime, video.startTime, handleTimeUpdate, loadingTimeout]);

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', e);
    setVideoError('Failed to load video. Check if the file exists.');
    setIsPlaying(false);
    setVideoLoaded(false);
  }, []);

  const handleVideoEnded = useCallback(() => {
    // When video ends, seek back to the start time (or 0 if no start time)
    if (videoRef.current) {
      const seekTime = video.startTime || 0;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
    setIsPlaying(false);
  }, [video.startTime]);

  const setCurrentAsStart = useCallback(async () => {
    const newStartTime = currentTime;
    setPendingSeekTime(newStartTime);
    
    try {
      const updatedVideo: Video = {
        ...video,
        startTime: newStartTime,
      };
      onVideoUpdate(updatedVideo);
    } catch (error) {
      console.error('Failed to update video:', error);
      setPendingSeekTime(null);
    }
  }, [currentTime, video, onVideoUpdate]);

  return {
    // State
    isPlaying,
    currentTime,
    videoError,
    videoLoaded,
    
    // Refs
    videoRef,
    
    // Handlers
    handlePlayPause,
    handleTimeUpdate,
    handleSeek,
    handleLoadedMetadata,
    handleVideoError,
    handleVideoEnded,
    setCurrentAsStart,
  };
}
