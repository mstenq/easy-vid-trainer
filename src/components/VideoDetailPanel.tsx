import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Trash2 } from 'lucide-react';
import type { Video } from '@/types';
import api from '@/services/api';

interface VideoDetailPanelProps {
  video: Video;
  onVideoUpdate: (video: Video) => void;
  onVideoDelete: (videoId: number) => void;
}

export function VideoDetailPanel({ video, onVideoUpdate, onVideoDelete }: VideoDetailPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(video.startTime);
  const [resolution, setResolution] = useState(video.resolution);
  const [cropX, setCropX] = useState(video.cropX);
  const [cropY, setCropY] = useState(video.cropY);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [videoDisplayDimensions, setVideoDisplayDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState(video.id);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Calculate crop dimensions based on resolution
  const getCropDimensions = useCallback(() => {
    const parts = resolution.split('x');
    if (parts.length !== 2) return { width: 100, height: 100 };
    
    const width = parseInt(parts[0] || '0');
    const height = parseInt(parts[1] || '0');
    
    if (!width || !height) return { width: 100, height: 100 };
    
    const videoAspectRatio = video.originalWidth / video.originalHeight;
    const targetAspectRatio = width / height;
    
    let cropWidth, cropHeight;
    
    if (targetAspectRatio > videoAspectRatio) {
      // Video is taller than target, fit by width
      cropWidth = video.originalWidth;
      cropHeight = Math.round(video.originalWidth / targetAspectRatio);
    } else {
      // Video is wider than target, fit by height
      cropHeight = video.originalHeight;
      cropWidth = Math.round(video.originalHeight * targetAspectRatio);
    }
    
    return { width: cropWidth, height: cropHeight };
  }, [resolution, video.originalWidth, video.originalHeight]);

  const cropDimensions = getCropDimensions();

  useEffect(() => {
    // Check if this is actually a different video
    const isNewVideo = video.id !== currentVideoId;
    
    setStartTime(video.startTime);
    setResolution(video.resolution);
    setCropX(video.cropX);
    setCropY(video.cropY);
    setVideoError(null);
    setVideoLoaded(false);
    setIsPlaying(false);
    
    // Only reset currentTime if it's a new video, not just an update to the same video
    if (isNewVideo) {
      // Set currentTime to the video's start time, or 0 if no start time
      setCurrentTime(video.startTime || 0);
      setCurrentVideoId(video.id);
      setPendingSeekTime(null); // Clear any pending seek when switching videos
    }
    
    // Reset video display dimensions to prevent using stale values from previous video
    setVideoDisplayDimensions({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Log video details for debugging
    const videoUrl = `http://localhost:3000/${video.filepath.replace(/^\/+/, '')}`;
    
    // Set a loading timeout
    const timeout = setTimeout(() => {
      if (!videoLoaded) {
        setVideoError('Video loading timed out. Please try refreshing the page.');
      }
    }, 10000); // 10 second timeout
    
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
  }, [video]);

  // Center crop when resolution changes, but not when video changes
  useEffect(() => {
    // Don't run centering logic during video switching
    // Check if the current crop values match what we expect from the video
    const expectedCropX = video.cropX;
    const expectedCropY = video.cropY;
    const expectedResolution = video.resolution;
    
    const isVideoStillLoading = 
      Math.abs(cropX - expectedCropX) > 0.1 || 
      Math.abs(cropY - expectedCropY) > 0.1 || 
      resolution !== expectedResolution;
    
    if (isVideoStillLoading) {
      return;
    }
    
    // Only recenter when resolution changes for the same video and crop is out of bounds
    const isOutOfBounds = 
      cropX + cropDimensions.width > video.originalWidth ||
      cropY + cropDimensions.height > video.originalHeight ||
      cropX < 0 ||
      cropY < 0;
    
    if (isOutOfBounds) {
      const centerX = Math.max(0, (video.originalWidth - cropDimensions.width) / 2);
      const centerY = Math.max(0, (video.originalHeight - cropDimensions.height) / 2);
      
      setCropX(centerX);
      setCropY(centerY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropDimensions.width, cropDimensions.height, resolution, cropX, cropY]);

  // Auto-save when resolution changes
  useEffect(() => {
    // Don't auto-save on initial load
    if (resolution !== video.resolution) {
      const autoSave = async () => {
        const updatedVideo: Video = {
          ...video,
          startTime,
          resolution,
          cropX,
          cropY,
          cropWidth: cropDimensions.width,
          cropHeight: cropDimensions.height,
        };

        try {
          const savedVideo = await api.videos.update(video.id, updatedVideo);
          onVideoUpdate(savedVideo);
        } catch (error) {
          console.error('Failed to update video:', error);
        }
      };
      
      autoSave();
    }
  }, [resolution]);

  const handlePlayPause = async () => {
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
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setCurrentAsStart = async () => {
    const newStartTime = currentTime;
    setStartTime(newStartTime);
    
    // Set pending seek time to preserve the current position
    setPendingSeekTime(newStartTime);
    
    // Auto-save when setting current time as start
    const updatedVideo: Video = {
      ...video,
      startTime: newStartTime,
      resolution,
      cropX,
      cropY,
      cropWidth: cropDimensions.width,
      cropHeight: cropDimensions.height,
    };

    try {
      const savedVideo = await api.videos.update(video.id, updatedVideo);
      onVideoUpdate(savedVideo);
    } catch (error) {
      console.error('Failed to update video:', error);
      setPendingSeekTime(null); // Clear pending seek on error
    }
  };

  const handleDeleteVideo = async () => {
    if (!confirm(`Are you sure you want to delete "${video.filename}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.videos.delete(video.id);
      onVideoDelete(video.id);
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Calculate actual video display dimensions considering object-contain
  const updateVideoDisplayDimensions = useCallback(() => {
    if (!videoRef.current || !videoContainerRef.current) return;
    
    const container = videoContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Ensure we have valid dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn('Container has zero dimensions, delaying update');
      // Retry after a brief delay
      setTimeout(() => updateVideoDisplayDimensions(), 100);
      return;
    }
    
    const videoAspectRatio = video.originalWidth / video.originalHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container, fit by width
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Video is taller than container, fit by height
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspectRatio;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    setVideoDisplayDimensions({ width: displayWidth, height: displayHeight, offsetX, offsetY });
  }, [video.originalWidth, video.originalHeight]);

  useEffect(() => {
    updateVideoDisplayDimensions();
    window.addEventListener('resize', updateVideoDisplayDimensions);
    return () => window.removeEventListener('resize', updateVideoDisplayDimensions);
  }, [updateVideoDisplayDimensions]);

  // Force recalculation when video ID changes to prevent stale dimensions
  useEffect(() => {
    if (videoLoaded) {
      // Add a small delay to ensure video element is fully rendered
      const timer = setTimeout(() => {
        updateVideoDisplayDimensions();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [video.id, videoLoaded, updateVideoDisplayDimensions]);

  // Additional effect to update dimensions when video loads
  useEffect(() => {
    if (videoLoaded) {
      // Use requestAnimationFrame to ensure the video element is fully rendered
      requestAnimationFrame(() => {
        updateVideoDisplayDimensions();
        // Double-check after a short delay in case of timing issues
        setTimeout(() => updateVideoDisplayDimensions(), 100);
      });
    }
  }, [videoLoaded, updateVideoDisplayDimensions]);

  // Force dimension recalculation when crop coordinates change significantly
  useEffect(() => {
    if (videoLoaded && videoDisplayDimensions.width > 0) {
      // Check if the crop position seems to be outside reasonable bounds
      const relativeX = cropX / video.originalWidth;
      const relativeY = cropY / video.originalHeight;
      
      if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
        console.warn('Crop coordinates out of bounds, refreshing dimensions');
        updateVideoDisplayDimensions();
      }
    }
  }, [cropX, cropY, videoLoaded, videoDisplayDimensions.width, video.originalWidth, video.originalHeight, updateVideoDisplayDimensions]);

  // Drag functionality for crop overlay
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!videoContainerRef.current || !videoDisplayDimensions.width) return;
    
    setIsDragging(true);
    const rect = videoContainerRef.current.getBoundingClientRect();
    const videoX = rect.left + videoDisplayDimensions.offsetX;
    const videoY = rect.top + videoDisplayDimensions.offsetY;
    
    const cropDisplayX = videoDisplayDimensions.offsetX + (cropX / video.originalWidth) * videoDisplayDimensions.width;
    const cropDisplayY = videoDisplayDimensions.offsetY + (cropY / video.originalHeight) * videoDisplayDimensions.height;
    
    const offsetX = e.clientX - rect.left - cropDisplayX;
    const offsetY = e.clientY - rect.top - cropDisplayY;
    setDragOffset({ x: offsetX, y: offsetY });
    
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !videoContainerRef.current || !videoDisplayDimensions.width) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - dragOffset.x - videoDisplayDimensions.offsetX;
    const relativeY = e.clientY - rect.top - dragOffset.y - videoDisplayDimensions.offsetY;
    
    const newX = (relativeX / videoDisplayDimensions.width) * video.originalWidth;
    const newY = (relativeY / videoDisplayDimensions.height) * video.originalHeight;
    
    // Constrain to video bounds
    const maxX = video.originalWidth - cropDimensions.width;
    const maxY = video.originalHeight - cropDimensions.height;
    
    setCropX(Math.max(0, Math.min(maxX, newX)));
    setCropY(Math.max(0, Math.min(maxY, newY)));
  }, [isDragging, dragOffset, video.originalWidth, video.originalHeight, cropDimensions, videoDisplayDimensions]);

  const handleMouseUp = useCallback(async () => {
    if (isDragging) {
      setIsDragging(false);
      // Auto-save when done dragging
      const updatedVideo: Video = {
        ...video,
        startTime,
        resolution,
        cropX,
        cropY,
        cropWidth: cropDimensions.width,
        cropHeight: cropDimensions.height,
      };

      try {
        const savedVideo = await api.videos.update(video.id, updatedVideo);
        onVideoUpdate(savedVideo);
      } catch (error) {
        console.error('Failed to update video:', error);
      }
    }
  }, [isDragging, video, startTime, resolution, cropX, cropY, cropDimensions, onVideoUpdate]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle>{video.filename}</CardTitle>
          <CardDescription>
            {video.originalWidth}×{video.originalHeight} • {formatTime(video.duration)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Video Element */}
            <div ref={videoContainerRef} className="relative bg-black rounded-lg overflow-hidden">
              {videoError && (
                <div className="absolute inset-0 z-10 bg-red-900/80 flex items-center justify-center">
                  <div className="text-white text-center p-4">
                    <p className="text-sm font-medium mb-2">Video Error</p>
                    <p className="text-xs opacity-75">{videoError}</p>
                  </div>
                </div>
              )}
              <video
                key={`${video.id}-${video.filepath}`} // Force recreation only when video file changes
                ref={videoRef}
                className="w-full h-120 object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
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
                  updateVideoDisplayDimensions();
                  // Clear loading timeout
                  if (loadingTimeout) {
                    clearTimeout(loadingTimeout);
                    setLoadingTimeout(null);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('Video error:', e);
                  setVideoError('Failed to load video. Check if the file exists.');
                  setIsPlaying(false);
                  setVideoLoaded(false);
                }}
                onLoadStart={() => {
                  setVideoError(null);
                  setVideoLoaded(false);
                }}
                onLoadedData={() => {
                  // Video data loaded
                }}
                onCanPlay={() => {
                  // Video can play
                }}
                onStalled={() => {
                  console.warn('Video stalled:', video.filename);
                  setVideoError('Video loading stalled. Check network connection.');
                }}
                onAbort={() => {
                  console.warn('Video loading aborted:', video.filename);
                }}
                onEnded={() => {
                  // When video ends, seek back to the start time (or 0 if no start time)
                  if (videoRef.current) {
                    const seekTime = video.startTime || 0;
                    videoRef.current.currentTime = seekTime;
                    setCurrentTime(seekTime);
                  }
                  setIsPlaying(false);
                }}
                controls={false}
              >
                <source src={`http://localhost:3000/${video.filepath.replace(/^\/+/, '')}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {!videoLoaded && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm opacity-75">Loading video...</p>
                    <p className="text-xs opacity-50 mt-1">{video.filename}</p>
                  </div>
                </div>
              )}
              
              {/* Crop Overlay */}
              {videoLoaded && 
               videoDisplayDimensions.width > 0 && 
               videoDisplayDimensions.height > 0 && 
               video.originalWidth > 0 && 
               video.originalHeight > 0 && 
               cropX >= 0 && 
               cropY >= 0 && 
               cropX < video.originalWidth && 
               cropY < video.originalHeight && (() => {
                const cropLeft = Math.max(0, videoDisplayDimensions.offsetX + (cropX / video.originalWidth) * videoDisplayDimensions.width);
                const cropTop = Math.max(0, videoDisplayDimensions.offsetY + (cropY / video.originalHeight) * videoDisplayDimensions.height);
                const cropWidth = Math.max(0, (cropDimensions.width / video.originalWidth) * videoDisplayDimensions.width);
                const cropHeight = Math.max(0, (cropDimensions.height / video.originalHeight) * videoDisplayDimensions.height);
                
                // Only log if there's a positioning issue that needs attention
                const expectedLeft = videoDisplayDimensions.offsetX + (cropX / video.originalWidth) * videoDisplayDimensions.width;
                const expectedTop = videoDisplayDimensions.offsetY + (cropY / video.originalHeight) * videoDisplayDimensions.height;
                
                if (Math.abs(cropLeft - expectedLeft) > 1 || Math.abs(cropTop - expectedTop) > 1) {
                  console.warn('Crop position mismatch detected - this may indicate a rendering issue');
                }
                
                return (
                  <div 
                    key={`crop-${video.id}-${cropX}-${cropY}`} // Force re-render when video or position changes
                    ref={cropOverlayRef}
                    className={`absolute border-2 border-red-500 bg-red-500/20 cursor-move ${isDragging ? 'border-red-400' : ''}`}
                    style={{
                      left: cropLeft,
                      top: cropTop,
                      width: cropWidth,
                      height: cropHeight,
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                        Crop Preview ({cropDimensions.width}×{cropDimensions.height})
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Video Controls */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Button 
                  size="sm" 
                  onClick={handlePlayPause}
                  disabled={!videoLoaded}
                  variant={videoError ? "destructive" : "default"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={video.duration}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full"
                  />
                </div>
                <span className="text-sm text-muted-foreground min-w-0">
                  {formatTime(currentTime)} / {formatTime(video.duration)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Video Configuration</CardTitle>
          <CardDescription>
            Configure start time, resolution, and crop settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Start Time */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                max={video.duration}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={setCurrentAsStart}>
                Use Current ({formatTime(currentTime)})
              </Button>
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label>Output Resolution</Label>
            <Select value={resolution} onValueChange={(value: typeof resolution) => setResolution(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1280x720">1280×720 (16:9 Landscape)</SelectItem>
                <SelectItem value="720x1280">720×1280 (9:16 Portrait)</SelectItem>
                <SelectItem value="768x768">768×768 (1:1 Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete Video */}
            <Button 
              variant="destructive" 
              onClick={handleDeleteVideo}
              disabled={isDeleting}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Video'}
            </Button>
    

        </CardContent>
      </Card>
    </div>
  );
}
