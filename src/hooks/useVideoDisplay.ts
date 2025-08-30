import { useState, useRef, useCallback } from 'react';

interface VideoDisplayDimensions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface UseVideoDisplayOptions {
  originalWidth: number;
  originalHeight: number;
}

export function useVideoDisplay({ originalWidth, originalHeight }: UseVideoDisplayOptions) {
  const [videoDisplayDimensions, setVideoDisplayDimensions] = useState<VideoDisplayDimensions>({ 
    width: 0, 
    height: 0, 
    offsetX: 0, 
    offsetY: 0 
  });
  
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate actual video display dimensions considering object-contain
  const updateVideoDisplayDimensions = useCallback(() => {
    if (!videoContainerRef.current || !originalWidth || !originalHeight) return;
    
    const container = videoContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Ensure we have valid dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }
    
    const videoAspectRatio = originalWidth / originalHeight;
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
  }, [originalWidth, originalHeight]);

  // Manual trigger for when video loads or when parent knows dimensions changed
  const handleVideoLoad = useCallback(() => {
    // Use a small delay to ensure the video element is properly sized
    requestAnimationFrame(() => {
      updateVideoDisplayDimensions();
    });
  }, [updateVideoDisplayDimensions]);

  // Manual trigger for window resize (to be called by parent)
  const handleResize = useCallback(() => {
    updateVideoDisplayDimensions();
  }, [updateVideoDisplayDimensions]);

  return {
    videoDisplayDimensions,
    videoContainerRef,
    updateVideoDisplayDimensions,
    handleVideoLoad,
    handleResize,
  };
}
