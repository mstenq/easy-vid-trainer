import { useState, useCallback, useRef } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoConfigurationPanel } from '@/components/VideoConfigurationPanel';
import { CropOverlay } from '@/components/CropOverlay';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useCropManagement } from '@/hooks/useCropManagement';
import { useVideoDisplay } from '@/hooks/useVideoDisplay';
import { useDrag } from '@/hooks/useDrag';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import type { Video } from '@/types';
import api from '@/services/api';

interface VideoDetailPanelProps {
  video: Video;
  onVideoUpdate: (video: Video) => void;
  onVideoDelete: (videoId: number) => void;
}

export function VideoDetailPanel({ video, onVideoUpdate, onVideoDelete }: VideoDetailPanelProps) {
  const [startTime, setStartTime] = useState(video.startTime);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Use refs to avoid recreating functions on every render
  const videoRef = useRef(video);
  const onVideoUpdateRef = useRef(onVideoUpdate);
  
  // Update refs when props change
  videoRef.current = video;
  onVideoUpdateRef.current = onVideoUpdate;

  const handleVideoUpdate = useCallback(async (updatedVideo: Partial<Video>) => {
    const savedVideo = await api.videos.update(videoRef.current.id, { ...videoRef.current, ...updatedVideo });
    onVideoUpdateRef.current(savedVideo);
  }, []);

  // Custom hooks for video functionality
  const videoPlayer = useVideoPlayer({ 
    video, 
    onVideoUpdate: handleVideoUpdate
  });

  const cropManagement = useCropManagement({ 
    video, 
    onVideoUpdate: handleVideoUpdate
  });

  const videoDisplay = useVideoDisplay({
    originalWidth: video.originalWidth,
    originalHeight: video.originalHeight,
    videoLoaded: videoPlayer.videoLoaded
  });

  const drag = useDrag({
    onDragEnd: (newX, newY) => {
      cropManagement.updateCropPosition(newX, newY);
      // Don't call saveCropChanges immediately - let the debounced save handle it
      cropManagement.scheduleSave();
    },
    videoDisplayDimensions: videoDisplay.videoDisplayDimensions,
    videoContainerRef: videoDisplay.videoContainerRef,
    originalWidth: video.originalWidth,
    originalHeight: video.originalHeight,
    cropWidth: cropManagement.cropWidth,
    cropHeight: cropManagement.cropHeight
  });

  const debouncedSave = useDebouncedSave({
    onSave: handleVideoUpdate,
    delay: 500
  });

  const handleStartTimeChange = (newStartTime: number) => {
    setStartTime(newStartTime);
    debouncedSave.scheduleSave({ startTime: newStartTime });
  };

  const handleCurrentAsStart = async () => {
    const newStartTime = videoPlayer.currentTime;
    setStartTime(newStartTime);
    await debouncedSave.saveImmediately({ startTime: newStartTime });
    // Trigger the video player's setCurrentAsStart for proper seek handling
    videoPlayer.setCurrentAsStart();
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

  const handleCropMouseDown = (e: React.MouseEvent) => {
    drag.handleMouseDown(e, cropManagement.cropX, cropManagement.cropY);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <VideoPlayer
        video={video}
        isPlaying={videoPlayer.isPlaying}
        currentTime={videoPlayer.currentTime}
        videoError={videoPlayer.videoError}
        videoLoaded={videoPlayer.videoLoaded}
        videoRef={videoPlayer.videoRef}
        videoContainerRef={videoDisplay.videoContainerRef}
        onPlayPause={videoPlayer.handlePlayPause}
        onTimeUpdate={videoPlayer.handleTimeUpdate}
        onSeek={videoPlayer.handleSeek}
        onLoadedMetadata={videoPlayer.handleLoadedMetadata}
        onVideoError={videoPlayer.handleVideoError}
        onVideoEnded={videoPlayer.handleVideoEnded}
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
          videoLoaded={videoPlayer.videoLoaded}
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
        isDeleting={isDeleting}
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
