import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoConfigurationPanel } from '@/components/VideoConfigurationPanel';
import { CropOverlay } from '@/components/CropOverlay';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useCropManagement } from '@/hooks/useCropManagement';
import { useVideoDisplay } from '@/hooks/useVideoDisplay';
import { useDrag } from '@/hooks/useDrag';
import { useUpdateVideo, useDeleteVideo } from '@/hooks/useQueries';
import type { Video } from '@/types';

interface VideoDetailPanelProps {
  video: Video;
  onVideoUpdate: (video: Video) => void;
  onVideoDelete: (videoId: number) => void;
}

export function VideoDetailPanel({ video, onVideoUpdate, onVideoDelete }: VideoDetailPanelProps) {
  const [startTime, setStartTime] = useState(video.startTime);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const prevVideoIdRef = useRef<number>(video.id);
  
  const updateVideoMutation = useUpdateVideo();
  const deleteVideoMutation = useDeleteVideo();

  // Custom hooks for video functionality
  const videoPlayer = useVideoPlayer();
  const cropManagement = useCropManagement({ video });
  const videoDisplay = useVideoDisplay({
    originalWidth: video.originalWidth,
    originalHeight: video.originalHeight,
  });

  const drag = useDrag({
    onDragEnd: (newX, newY) => {
      cropManagement.updateCropPosition(newX, newY);
    },
    videoDisplayDimensions: videoDisplay.videoDisplayDimensions,
    videoContainerRef: videoDisplay.videoContainerRef,
    originalWidth: video.originalWidth,
    originalHeight: video.originalHeight,
    cropWidth: cropManagement.cropWidth,
    cropHeight: cropManagement.cropHeight
  });

  // Reset local state when video changes
  useEffect(() => {
    setStartTime(video.startTime);
    // Only reset videoLoaded when video ID changes (new video)
    if (video.id !== prevVideoIdRef.current) {
      setVideoLoaded(false);
      prevVideoIdRef.current = video.id;
    }
  }, [video.id, video.startTime]);

  // Handle video loading and resizing
  useEffect(() => {
    const handleResize = () => videoDisplay.handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // No dependencies needed for resize handler

  const handleStartTimeChange = (newStartTime: number) => {
    setStartTime(newStartTime);
    // Update via mutation
    updateVideoMutation.mutate({
      id: video.id,
      data: { startTime: newStartTime }
    });
  };

  const handleCurrentAsStart = () => {
    const newStartTime = videoPlayer.currentTime;
    setStartTime(newStartTime);
    // Immediate save
    updateVideoMutation.mutate({
      id: video.id,
      data: { startTime: newStartTime }
    });
  };

  const handleDeleteVideo = async () => {
    if (!confirm(`Are you sure you want to delete "${video.filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteVideoMutation.mutateAsync(video.id);
      onVideoDelete(video.id);
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    }
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    drag.handleMouseDown(e, cropManagement.cropX, cropManagement.cropY);
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
    videoDisplay.handleVideoLoad();
    // Automatically seek to start time when video loads
    if (video.startTime > 0) {
      videoPlayer.seekTo(video.startTime);
    }
  };

  const handleVideoEnded = () => {
    // Return to start time when video ends
    if (video.startTime > 0) {
      videoPlayer.seekTo(video.startTime);
    }
  };

  const handleSeek = (time: number) => {
    videoPlayer.seekTo(time);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <VideoPlayer
        video={video}
        isPlaying={videoPlayer.isPlaying}
        currentTime={videoPlayer.currentTime}
        videoError={null}
        videoLoaded={videoLoaded}
        videoRef={videoPlayer.videoRef}
        videoContainerRef={videoDisplay.videoContainerRef}
        onPlayPause={videoPlayer.togglePlayPause}
        onTimeUpdate={videoPlayer.handleTimeUpdate}
        onSeek={handleSeek}
        onLoadedMetadata={() => {
          videoPlayer.handleLoadedMetadata();
          handleVideoLoad();
        }}
        onVideoError={() => {}}
        onVideoEnded={handleVideoEnded}
      >
        <CropOverlay
          cropX={cropManagement.cropX}
          cropY={cropManagement.cropY}
          cropWidth={cropManagement.cropWidth}
          cropHeight={cropManagement.cropHeight}
          originalWidth={video.originalWidth}
          originalHeight={video.originalHeight}
          videoDisplayDimensions={videoDisplay.videoDisplayDimensions}
          isDragging={drag.isDragging}
          onMouseDown={handleCropMouseDown}
          videoId={video.id}
          videoLoaded={videoLoaded}
          tempPosition={drag.tempPosition}
        />
      </VideoPlayer>

      <VideoConfigurationPanel
        video={video}
        startTime={startTime}
        currentTime={videoPlayer.currentTime}
        resolution={cropManagement.resolution}
        cropWidth={cropManagement.cropWidth}
        cropHeight={cropManagement.cropHeight}
        isDeleting={deleteVideoMutation.isPending}
        onStartTimeChange={handleStartTimeChange}
        onCurrentAsStart={handleCurrentAsStart}
        onResolutionChange={cropManagement.handleResolutionChange}
        onCropSizeChange={cropManagement.updateCropSize}
        onResetCropToMax={cropManagement.resetCropToMax}
        onDeleteVideo={handleDeleteVideo}
      />
    </div>
  );
}
